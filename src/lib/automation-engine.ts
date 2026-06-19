import { db } from "@/lib/db"
import { sendMail, personalizeHtml } from "@/lib/email"

export async function enrollContactInWorkflow(contactId: string, automationRuleId: string, organizationId: string) {
  // Check if contact is already enrolled
  const existingState = await db.contactAutomationState.findUnique({
    where: {
      contactId_automationRuleId: {
        contactId,
        automationRuleId,
      },
    },
  })

  if (existingState) {
    if (existingState.status === "ACTIVE") {
      console.log(`Contact ${contactId} is already active in automation ${automationRuleId}`)
      return null
    }
    // Delete previous completed/exited history to re-enroll
    await db.contactAutomationState.delete({
      where: { id: existingState.id }
    })
  }

  // Create initial state
  const state = await db.contactAutomationState.create({
    data: {
      contactId,
      automationRuleId,
      status: "ACTIVE",
      currentStepId: "trigger-node",
      completedSteps: ["trigger-node"],
      organizationId,
    },
  })

  // Log workflow entrance activity
  await db.automationLog.create({
    data: {
      contactId,
      automationRuleId,
      nodeId: "trigger-node",
      nodeType: "triggerNode",
      action: "ENTERED",
      details: { message: "Contact enrolled in workflow via event trigger" },
      organizationId,
    },
  })

  return state
}

export async function executeWorkflowJourney(
  contactId: string,
  automationRuleId: string,
  organizationId: string,
  currentStateId: string,
  step: any // Inngest step runner
) {
  const rule = await db.automationRule.findUnique({
    where: { id: automationRuleId },
  })

  if (!rule || !rule.isActive) {
    console.log(`Rule ${automationRuleId} not found or inactive.`)
    return
  }

  const nodes = (rule.nodes as any[]) || []
  const edges = (rule.edges as any[]) || []

  let currentNodeId = currentStateId
  let finished = false

  while (!finished) {
    // Find next node from edges
    const outgoingEdges = edges.filter((e) => e.source === currentNodeId)

    if (outgoingEdges.length === 0) {
      // Reached the end of the path
      await db.contactAutomationState.update({
        where: { contactId_automationRuleId: { contactId, automationRuleId } },
        data: {
          status: "COMPLETED",
          completedAt: new Date(),
        },
      })
      await db.automationLog.create({
        data: {
          contactId,
          automationRuleId,
          nodeId: currentNodeId,
          nodeType: "end",
          action: "EXITED",
          details: { message: "Contact completed workflow journey successfully" },
          organizationId,
        },
      })
      finished = true
      break
    }

    let nextNodeId: string | null = null

    // Fetch details of current node to check conditions or delays
    const currentNode = nodes.find((n) => n.id === currentNodeId)

    if (currentNode?.type === "conditionNode") {
      // Evaluate condition
      const contact = await db.contact.findUnique({
        where: { id: contactId },
      })

      if (!contact) {
        finished = true
        break
      }

      const isMatch = evaluateCondition(contact, currentNode.data)
      const targetHandle = isMatch ? "true" : "false"

      const matchingEdge = outgoingEdges.find((e) => e.sourceHandle === targetHandle)
      if (matchingEdge) {
        nextNodeId = matchingEdge.target
      } else {
        // Exited path
        await db.contactAutomationState.update({
          where: { contactId_automationRuleId: { contactId, automationRuleId } },
          data: {
            status: "EXITED",
            exitReason: `Condition branch ${targetHandle} path not connected`,
            completedAt: new Date(),
          },
        })
        finished = true
        break
      }
    } else {
      // Standard action/trigger node -> only 1 output path
      nextNodeId = outgoingEdges[0].target
    }

    if (!nextNodeId) {
      finished = true
      break
    }

    // Now execute nextNodeId
    const nextNode = nodes.find((n) => n.id === nextNodeId)
    if (!nextNode) {
      finished = true
      break
    }

    currentNodeId = nextNodeId

    // Update state progress
    const state = await db.contactAutomationState.findUnique({
      where: { contactId_automationRuleId: { contactId, automationRuleId } },
    })
    const completed = Array.isArray(state?.completedSteps) ? (state.completedSteps as string[]) : []

    await db.contactAutomationState.update({
      where: { contactId_automationRuleId: { contactId, automationRuleId } },
      data: {
        currentStepId: nextNodeId,
        completedSteps: [...new Set([...completed, nextNodeId])],
      },
    })

    if (nextNode.type === "actionNode") {
      const { actionType } = nextNode.data

      if (actionType === "SEND_EMAIL") {
        const campaignId = nextNode.data.campaignId
        if (campaignId) {
          const campaign = await db.campaign.findUnique({
            where: { id: campaignId },
          })
          const contact = await db.contact.findUnique({
            where: { id: contactId },
          })

          if (campaign && contact) {
            const html = personalizeHtml(campaign.htmlContent || "", contact)

            let emailAttachments: Array<{ filename: string; path: string }> = []
            if (campaign.designContent) {
              try {
                const design = typeof campaign.designContent === "string"
                  ? JSON.parse(campaign.designContent)
                  : campaign.designContent
                if (design && design.promoAttachmentUrl) {
                  emailAttachments.push({
                    filename: design.promoAttachmentName || "attachment",
                    path: design.promoAttachmentUrl,
                  })
                }
              } catch (err) {
                console.error("Failed to parse campaign attachments:", err)
              }
            }

            try {
              await sendMail({
                to: contact.email,
                subject: campaign.subject || "Automation Campaign",
                html,
                attachments: emailAttachments.length > 0 ? emailAttachments : undefined,
              })

              await db.automationLog.create({
                data: {
                  contactId,
                  automationRuleId,
                  nodeId: nextNodeId,
                  nodeType: "actionNode",
                  action: "EXECUTED",
                  details: { message: `Email campaign "${campaign.name}" sent to ${contact.email}` },
                  organizationId,
                },
              })
            } catch (err: any) {
              await db.automationLog.create({
                data: {
                  contactId,
                  automationRuleId,
                  nodeId: nextNodeId,
                  nodeType: "actionNode",
                  action: "FAILED",
                  details: { error: err.message, message: `Failed to dispatch email to ${contact.email}` },
                  organizationId,
                },
              })
            }
          }
        }
      } else if (actionType === "WAIT") {
        const waitDays = Number(nextNode.data.waitDays) || 0
        if (waitDays > 0) {
          // Pause/Sleep execution using Inngest step sleep
          await db.automationLog.create({
            data: {
              contactId,
              automationRuleId,
              nodeId: nextNodeId,
              nodeType: "actionNode",
              action: "ENTERED",
              details: { message: `Entering wait period for ${waitDays} day(s)` },
              organizationId,
            },
          })

          // Trigger sleep via Inngest step runner
          await step.sleep(`wait-delay-${nextNodeId}`, `${waitDays}d`)

          await db.automationLog.create({
            data: {
              contactId,
              automationRuleId,
              nodeId: nextNodeId,
              nodeType: "actionNode",
              action: "EXECUTED",
              details: { message: `Wait delay completed. Resuming journey.` },
              organizationId,
            },
          })
        }
      } else if (actionType === "ADD_TAG") {
        const tagName = nextNode.data.tagName
        if (tagName) {
          await db.contact.update({
            where: { id: contactId },
            data: {
              tags: {
                connectOrCreate: {
                  where: { organizationId_name: { organizationId, name: tagName } },
                  create: { name: tagName, organizationId },
                },
              },
            },
          })

          await db.automationLog.create({
            data: {
              contactId,
              automationRuleId,
              nodeId: nextNodeId,
              nodeType: "actionNode",
              action: "EXECUTED",
              details: { message: `Added tag "${tagName}" to contact` },
              organizationId,
            },
          })
        }
      } else if (actionType === "REMOVE_TAG") {
        const tagName = nextNode.data.tagName
        if (tagName) {
          const tag = await db.tag.findUnique({
            where: { organizationId_name: { organizationId, name: tagName } },
          })
          if (tag) {
            await db.contact.update({
              where: { id: contactId },
              data: {
                tags: {
                  disconnect: { id: tag.id },
                },
              },
            })
          }

          await db.automationLog.create({
            data: {
              contactId,
              automationRuleId,
              nodeId: nextNodeId,
              nodeType: "actionNode",
              action: "EXECUTED",
              details: { message: `Removed tag "${tagName}" from contact` },
              organizationId,
            },
          })
        }
      } else if (actionType === "UPDATE_CONTACT") {
        const field = nextNode.data.updateField
        const val = nextNode.data.updateValue

        if (field) {
          const updateData: Record<string, any> = {}
          updateData[field] = val

          await db.contact.update({
            where: { id: contactId },
            data: updateData,
          })

          await db.automationLog.create({
            data: {
              contactId,
              automationRuleId,
              nodeId: nextNodeId,
              nodeType: "actionNode",
              action: "EXECUTED",
              details: { message: `Updated contact property: ${field} = ${val}` },
              organizationId,
            },
          })
        }
      }
    }
  }
}

function evaluateCondition(contact: any, data: any): boolean {
  const variable = data.variable || "email"
  const operator = data.operator || "EQUALS"
  const compareValue = String(data.value || "").toLowerCase()
  const contactValue = String(contact[variable] || "").toLowerCase()

  switch (operator) {
    case "EQUALS":
      return contactValue === compareValue
    case "CONTAINS":
      return contactValue.includes(compareValue)
    case "STARTS_WITH":
      return contactValue.startsWith(compareValue)
    case "ENDS_WITH":
      return contactValue.endsWith(compareValue)
    case "IS_EMPTY":
      return !contactValue || contactValue.trim() === ""
    default:
      return false
  }
}
