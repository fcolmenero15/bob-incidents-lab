# SRE Incident Response: Team Runbook

**Owner:** Platform SRE Team
**Applies to:** Production service incidents affecting availability, latency, or capacity
**Version:** 1.2
**Status:** Internal, team operating procedure
**Last reviewed:** This quarter
**Next review:** Next quarter, or after any incident that exposes a gap in this process

---

## Revision history

| Version | Change |
|---|---|
| 1.0 | Initial draft of the flow, written after a scaling incident that took too long to get sign off |
| 1.1 | Added severity tiers after an on call engineer paged the whole team for a non urgent issue |
| 1.2 | Clarified the approval gate after a change was applied before the approver actually replied |

---

## Purpose

This is how our team responds when a production service starts misbehaving: slow responses, errors, or early signs of resource strain. It is the sequence/procedure an engineer follows.

## Severity, roughly

Not every incident deserves the same urgency, and this runbook does not apply the same way to a completely down service versus one running slow for a subset of users. As a rough guide:

* **High.** Service is down or unusable for most users. Start the flow immediately, do not wait for a second opinion to confirm it is real.
* **Medium.** Degraded performance or partial impact. Confirm with metrics before treating it as an incident, most of these can wait for the current diagnostic step to finish before anyone gets pulled in.
* **Low.** Cosmetic or isolated issue with a workaround. Log it and handle it during normal hours unless it starts trending toward medium.

If in doubt, treat it as one severity higher until the diagnosis says otherwise. Downgrading later is easy, upgrading late is how minor issues turn into long outages.

## How we work

A few things hold regardless of what actually broke:

* **Diagnose before touching anything.** Confirm the problem with real signals, health checks, logs, metrics, before proposing a fix. A hunch is a starting point for investigation, not justification for a change.
* **Write it down as you go.** Every incident gets a ticket, and findings get logged as work notes in real time rather than reconstructed afterward from memory.
* **Nobody changes production alone.** Any consequential change, scaling, new infrastructure, reconfiguration, gets proposed and explicitly approved before it is applied. Silence is not approval.
* **A fix is not done until it is verified.** Re run the same checks used during diagnosis and confirm the service is actually healthy before closing anything out.

## The flow

One engineer typically carries a small incident end to end. The approval step is where a second set of eyes always comes in, even if that second person is just a peer glancing at the plan for two minutes.

### 1. Detect and confirm

Something looks wrong, a service is slow or throwing errors. Confirm it is real by pulling current metrics and running the standard health check against the affected service. The goal here is separating an actual incident from noise. A single alert is not an incident, a health check that fails twice in a row usually is.

### 2. Diagnose

With the problem confirmed, dig into why. Review container states, endpoint responses, and recent logs to locate the bottleneck or failure. This stage ends when there is a clear picture of what is failing and a reasonable guess at the fix, not necessarily certainty.

### 3. Open the ticket

Once there is a real incident with a diagnosis taking shape, open an incident ticket and record what has been found so far: symptoms, affected service, and the metrics backing it up. This is the record everything else hangs off, so it should be started early rather than written up after the fact.

### 4. Propose the fix and request approval

Decide on a remediation and write it up as a concrete, reviewable proposal: what will change and the expected effect. This is the approval gate. For anything that alters production, the proposed change is presented and the engineer waits for an explicit yes before applying it. A proposal without an answer is not a green light, and going ahead anyway defeats the entire point of this step.

### 5. Apply the fix

With approval granted, apply the change exactly as proposed, nothing more and nothing less than what was approved. If the situation has shifted enough that the original proposal no longer fits, that is a new proposal, not a reason to improvise. Update the ticket to reflect what was actually done.

### 6. Verify

Re run the same health check used during diagnosis and confirm the service is back to healthy. If it is not, go back to diagnosis rather than closing the ticket on hope.

### 7. Close

Once the service is confirmed healthy, close the ticket with a short resolution summary: what was wrong, what was done, and how it was verified. Anyone reading it later should be able to follow the full story without asking the engineer to explain it in person.

## Who does what

This is not a handoff between separate teams, it is the set of responsibilities one incident moves through.

* **The responding engineer** owns the incident end to end: detecting, diagnosing, documenting, proposing the fix, applying it once approved, verifying, and closing.
* **The approver** is whoever holds sign off for production changes on that service. Their job is the gate at stage four: reviewing the proposed change and approving or rejecting it before anything is applied. On most incidents this is a peer or lead reviewing the plan, not a formal committee.

The engineer does not skip the gate, and does not apply an unapproved production change regardless of how confident they are in the fix.

## Common ways this goes wrong

Worth naming since these show up more often than a clean process description suggests:

* Treating a single noisy alert as confirmed without checking metrics first.
* Proposing a fix and applying it before the approver has actually responded.
* Applying something broader than what was approved because it seemed like a reasonable improvement while already in there.
* Closing the ticket based on the fix looking right rather than the verification check actually passing.
* Writing the ticket up after the incident is resolved instead of logging findings as they happen.

## What good looks like

An incident handled well leaves behind:

* A ticket opened early, with diagnostic findings recorded as work notes rather than a summary written afterward.
* A clearly proposed change that was approved before it went in.
* A verification step showing the service healthy again, not just assumed healthy.
* A closing summary someone unfamiliar with the incident could read and fully understand.

Diagnose, document, approve, fix, verify, close. Same order, every time, regardless of how obvious the fix seems at the start.