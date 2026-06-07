# Personalized Guess Who

## Problem
Regular Guess Who gets stale fast — the character set is fixed, generic, and has no connection to the people playing it. The requester's friend group already plays it together and burns through the novelty quickly, with no easy way to make a version that's actually about them.

## Evidence
- Friends have said things like "this would be way better if it was about us" after playing the standard game — an unprompted signal from the actual people who'd play this, though still anecdotal rather than something tested at scale.

## Users
- **Primary**: The requester and their ~10-person friend group — people who already play Guess Who together, on a mix of devices (a web app needs to work for everyone regardless of platform), using the group's own scanned materials (yearbook pages, rosters, group photos).
- **Not for**: The general public, schools/teams/communities outside this friend group, or any multi-tenant "anyone can sign up" use. The repo and the game stay private to this group — broader audiences are intentionally out of scope (see below), which removes most of the auth, privacy-hardening, and abuse-prevention work a public product would require.

## Hypothesis
We believe **letting this friend group turn their own photos and rosters into personalized character decks (extracted on-device, so raw photos stay private) and play real-time custom Guess Who with them** will **make the game feel fresh again instead of stale**
for **the requester and their ~10-person friend group**.
We'll know we're right when **the group plays a full session smoothly, wants to play again afterward, and people point to the personalization — real faces plus inside-joke traits — as the reason it's better than the original game**, rather than the novelty wearing off after one try.

## Success Metrics
| Metric | Target | How measured |
|---|---|---|
| Group completes a full live game night session | 1 full round played end-to-end with ~10 participants, no session-ending blockers | Direct observation / debrief with the group right after playing |
| Group asks to play again | A repeat session happens without the requester having to push for it | Informal follow-up with the group in the weeks after the first session |
| Card extraction feels "good enough" to use as-is | Most names/faces on a real scanned page are captured correctly without manual fixing | Manual review by the requester during deck creation, checked against the source scan |

## Scope
**MVP** — A complete, playable version of the actual game for this one friend group, end to end: upload a real scanned page or roster → get auto-extracted character cards (in-browser OCR + face detection, raw images not stored by default) → add custom/inside-joke traits to cards → organize cards into a private pack → create a room and bring the ~10-person group in → play a full real-time round of custom Guess Who mixing physical and inside-joke traits. Both the AI extraction and real-time play are part of the MVP by the requester's choice — there's no "lite" version planned before this; the goal is to get to a playable game night as directly as possible.

**Out of scope**
- Public sign-up, arbitrary strangers, or multiple independent groups sharing one instance — why deferred: explicitly scoped to "just my friend group," which is what makes the privacy and trust model simple
- School/team/community-oriented features — admin tooling, moderation, onboarding for people the requester doesn't know — why deferred: not the target user; the original broader framing was intentionally narrowed to one known group
- Sharing or porting decks/packs between different friend groups — why deferred: there's only one group to design for right now
- Spectator mode, voice/video chat, native mobile apps — why deferred: bare-minimum focus; a responsive web app already covers "any device"
- Visual theming/customization beyond what's needed to play comfortably — why deferred: ship the actual game first, polish later if it's still fun after the novelty wears off

## Delivery Milestones
<!-- Business outcomes, not engineering tasks. /plan turns each into a plan. -->
<!-- Status: pending | in-progress | complete -->

| # | Milestone | Outcome | Status | Plan |
|---|---|---|---|---|
| 1 | Cards from real materials | Upload an actual scanned page from the group's own materials and get usable character cards — face, name, and room to add custom traits — with raw images not leaving the device by default | in-progress | `.claude/plans/personalized-guess-who.plan.md` |
| 2 | Private packs & rooms | Organize extracted cards into a pack, create a private room, and get the ~10-person friend group into it from their own devices | pending | — |
| 3 | Live custom Guess Who | Play a complete real-time round end to end, mixing physical traits and inside-joke traits, with the full group connected and playing together | pending | — |

## Open Questions
- [ ] How are "non-physical / inside-joke" traits actually captured? OCR and face detection can surface names and faces, but inside jokes can only come from a person typing them in — does the MVP need a clear flow for adding these to cards, and who's allowed to do it (just the deck creator, or the group together)?
- [ ] Will OCR + face detection hold up on the group's real scanned pages? Even with good-quality scans, yearbook- and roster-style layouts can be dense, mix fonts, and have older print quality — worth testing against the requester's actual materials early rather than assuming it "just works."
- [ ] What's the lightest-weight way to keep ~10 people in sync during a live round without standing up and maintaining a traditional backend — and how does keeping the source private factor into wherever that piece ends up living?

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| OCR/face detection on the group's real materials is less accurate than hoped, making card creation feel tedious instead of magical | Medium | High — this is the core "wow" moment the rest of the game is built on | Test against the requester's actual scanned pages as early as Milestone 1, and plan for a manual-correction step rather than assuming fully automatic extraction |
| Wanting both AI extraction and real-time multiplayer in the very first playable version raises delivery complexity for a side project | Medium | Medium — risk of losing momentum before anyone gets to actually play | Sequence milestones so each one is independently demoable and a little fun on its own, so the group sees (and can react to) progress before everything is finished |
| Real-time sync for ~10 players needs more shared infrastructure than "no backend" suggests | Medium | Medium — affects cost, complexity, and how private the setup can stay | Resolve the minimal-infrastructure approach explicitly during /plan rather than assuming it away |

---
*Status: DRAFT — requirements only. Implementation planning pending via /plan.*
