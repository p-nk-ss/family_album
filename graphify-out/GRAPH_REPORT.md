# Graph Report - .  (2026-06-21)

## Corpus Check
- Corpus is ~2,767 words - fits in a single context window. You may not need a graph.

## Summary
- 19 nodes · 18 edges · 4 communities
- Extraction: 89% EXTRACTED · 11% INFERRED · 0% AMBIGUOUS · INFERRED: 2 edges (avg confidence: 0.8)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Design Philosophy & Principles|Design Philosophy & Principles]]
- [[_COMMUNITY_Design Process & Critique|Design Process & Critique]]
- [[_COMMUNITY_Quality & Design Systems|Quality & Design Systems]]
- [[_COMMUNITY_Writing & Voice|Writing & Voice]]

## God Nodes (most connected - your core abstractions)
1. `Frontend Design` - 8 edges
2. `Two-Pass Process` - 3 edges
3. `Writing As Design Material` - 3 edges
4. `Ground It In The Subject` - 2 edges
5. `Design Token System` - 2 edges
6. `Signature Element` - 2 edges
7. `AI-Generated Default Looks` - 2 edges
8. `Plan Critique Against Brief` - 2 edges
9. `Restraint And Self-Critique` - 2 edges
10. `Hero As Thesis` - 1 edges

## Surprising Connections (you probably didn't know these)
- `Frontend Design` --references--> `Apache License 2.0`  [EXTRACTED]
  .agents/skills/frontend-design/SKILL.md → .agents/skills/frontend-design/LICENSE.txt

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **Two-Pass Design Workflow** — frontend_design_skill_two_pass_process, frontend_design_skill_token_system, frontend_design_skill_plan_critique, frontend_design_skill_signature_element [EXTRACTED 0.85]
- **Distinctiveness Design Principles** — frontend_design_skill_hero_as_thesis, frontend_design_skill_typography_personality, frontend_design_skill_structure_is_information, frontend_design_skill_deliberate_motion, frontend_design_skill_match_complexity_to_vision [EXTRACTED 0.85]

## Communities (4 total, 0 thin omitted)

### Community 0 - "Design Philosophy & Principles"
Cohesion: 0.29
Nodes (7): Apache License 2.0, Deliberate Motion, Frontend Design, Hero As Thesis, Match Complexity To Vision, Structure Is Information, Typography Carries Personality

### Community 1 - "Design Process & Critique"
Cohesion: 0.40
Nodes (5): AI-Generated Default Looks, CSS Selector Specificity Caution, Ground It In The Subject, Plan Critique Against Brief, Two-Pass Process

### Community 2 - "Quality & Design Systems"
Cohesion: 0.50
Nodes (4): Quality Floor, Restraint And Self-Critique, Signature Element, Design Token System

### Community 3 - "Writing & Voice"
Cohesion: 0.67
Nodes (3): Active Voice And Consistency, User-Side Voice, Writing As Design Material

## Knowledge Gaps
- **2 isolated node(s):** `Quality Floor`, `Apache License 2.0`
  These have ≤1 connection - possible missing edges or undocumented components.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `Frontend Design` connect `Design Philosophy & Principles` to `Design Process & Critique`, `Writing & Voice`?**
  _High betweenness centrality (0.745) - this node is a cross-community bridge._
- **Why does `Ground It In The Subject` connect `Design Process & Critique` to `Design Philosophy & Principles`?**
  _High betweenness centrality (0.523) - this node is a cross-community bridge._
- **What connects `Hero As Thesis`, `Typography Carries Personality`, `Structure Is Information` to the rest of the system?**
  _10 weakly-connected nodes found - possible documentation gaps or missing edges._