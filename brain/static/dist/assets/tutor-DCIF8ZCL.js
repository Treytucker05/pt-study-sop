import{c as D,r as d,j as e,b as k,q as U}from"./index-D0nNMQ5f.js";import{B as j,o as E,u as P,L as W,s as K,p as A}from"./index-DKnvLOCo.js";import{C as v,a as L,b as R,c as z}from"./card-Be4On9eI.js";import{T as $,a as q,b as O,d as M}from"./tabs-BejllD_g.js";import{B as _}from"./badge-UPP_nPge.js";import{L as I}from"./loader-circle-5nzVihWJ.js";import{b as w,a as F,C as Y,M as V,r as X,F as J}from"./index-CgcPyczy.js";import{L as Q}from"./link-D-xZmbEK.js";/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const Z=[["path",{d:"m16 18 6-6-6-6",key:"eg8j8"}],["path",{d:"m8 6-6 6 6 6",key:"ppft3o"}]],T=D("code",Z);/**
 * @license lucide-react v0.545.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const ee=[["path",{d:"M11.017 2.814a1 1 0 0 1 1.966 0l1.051 5.558a2 2 0 0 0 1.594 1.594l5.558 1.051a1 1 0 0 1 0 1.966l-5.558 1.051a2 2 0 0 0-1.594 1.594l-1.051 5.558a1 1 0 0 1-1.966 0l-1.051-5.558a2 2 0 0 0-1.594-1.594l-5.558-1.051a1 1 0 0 1 0-1.966l5.558-1.051a2 2 0 0 0 1.594-1.594z",key:"1s2grr"}],["path",{d:"M20 2v4",key:"1rf3ol"}],["path",{d:"M22 4h-4",key:"gwowj6"}],["circle",{cx:"4",cy:"20",r:"2",key:"6kqj1y"}]],se=D("sparkles",ee);function te(n){return n.toLowerCase().trim().replace(/[^\w\s-]/g,"").replace(/\s+/g,"-").slice(0,80)}function ae(n){const s=(n||"").split(`
`),o=/^(#{1,6})\s+(.+?)\s*$/,r=[];for(let m=0;m<s.length;m++){const i=s[m].match(o);if(!i)continue;const c=i[1].length,g=i[2].trim(),l=`${c}-${te(g)}-${m+1}`;r.push({id:l,level:c,title:g,startLine:m+1})}return r.map((m,i)=>{const c=r[i+1],g=c?c.startLine-1:s.length;return{...m,endLine:g}})}function re(n,s){const o=(n||"").split(`
`),r=Math.max(0,s.startLine-1),x=Math.min(o.length,s.endLine);return o.slice(r,x).join(`
`).trim()}function ne({path:n,content:s}){const o=d.useMemo(()=>ae(s),[s]),[r,x]=d.useState(null),[m,i]=d.useState("teach"),[c,g]=d.useState(!1),[l,p]=d.useState(null),h=d.useMemo(()=>o.find(t=>t.id===r)||null,[o,r]),S=async()=>{if(h){g(!0),p(null);try{const t=re(s,h),b=await fetch("/api/sop/explain",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({path:n,heading:h.title,level:h.level,excerpt:t,mode:m})}),f=await b.json().catch(()=>({ok:!1,message:b.statusText}));b.ok?p(f):p({ok:!1,...f||{},message:f?.message||f?.error||b.statusText})}catch(t){p({ok:!1,message:t.message})}finally{g(!1)}}};return e.jsxs("div",{className:"grid lg:grid-cols-3 gap-4",children:[e.jsxs(v,{className:"bg-black/40 border-2 border-primary rounded-none lg:col-span-1 flex flex-col",children:[e.jsxs(L,{className:"border-b border-secondary p-3 sticky top-0 bg-black/95 z-10",children:[e.jsx(R,{className:"font-arcade text-sm text-primary",children:"BREAKDOWN OUTLINE"}),e.jsxs("div",{className:"flex gap-2 mt-2",children:[e.jsx(j,{size:"sm",variant:m==="teach"?"default":"ghost",className:"rounded-none font-arcade text-[10px] h-7",onClick:()=>i("teach"),children:"TEACH"}),e.jsx(j,{size:"sm",variant:m==="drill"?"default":"ghost",className:"rounded-none font-arcade text-[10px] h-7",onClick:()=>i("drill"),children:"DRILL"})]})]}),e.jsx("div",{className:"flex-1",children:e.jsx("div",{className:"p-2 space-y-1",children:o.length===0?e.jsx("div",{className:"font-terminal text-xs text-muted-foreground p-3",children:"No headings found. Add headings (`#`, `##`, `###`) to get a structured breakdown."}):o.map(t=>e.jsxs("button",{onClick:()=>{x(t.id),p(null)},className:k("w-full text-left px-2 py-1.5 font-terminal text-xs flex items-center gap-2 border border-transparent hover:border-primary/40 hover:bg-primary/10",r===t.id&&"border-primary/60 bg-primary/10"),children:[e.jsxs(_,{variant:"outline",className:"rounded-none text-[9px] border-secondary",children:["H",t.level]}),e.jsx("span",{className:"truncate",style:{paddingLeft:Math.max(0,(t.level-1)*10)},title:t.title,children:t.title})]},t.id))})})]}),e.jsxs(v,{className:"bg-black/60 border-2 border-primary rounded-none lg:col-span-2 flex flex-col",children:[e.jsxs(L,{className:"border-b border-secondary p-3 sticky top-0 bg-black/95 z-10",children:[e.jsxs("div",{className:"flex items-center justify-between gap-2",children:[e.jsx(R,{className:"font-arcade text-sm text-primary",children:h?"SECTION EXPLANATION":"SELECT A HEADING"}),e.jsx(j,{size:"sm",className:"rounded-none font-arcade text-[10px] h-8",onClick:S,disabled:!h||c,"data-testid":"button-sop-explain",children:c?e.jsxs(e.Fragment,{children:[e.jsx(I,{className:"w-3 h-3 mr-2 animate-spin"})," EXPLAINING..."]}):e.jsxs(e.Fragment,{children:[e.jsx(se,{className:"w-3 h-3 mr-2"})," EXPLAIN THIS"]})})]}),h&&e.jsxs("div",{className:"font-terminal text-[10px] text-muted-foreground mt-1",children:[h.title," (H",h.level,") • ",n]})]}),e.jsx(z,{className:"p-4 space-y-3",children:h?l?.ok===!1?e.jsxs("div",{className:"p-3 bg-red-900/20 border border-red-500/50 rounded-none",children:[e.jsx("div",{className:"font-arcade text-[10px] text-red-300 mb-2",children:"EXPLAIN FAILED"}),e.jsx("div",{className:"font-terminal text-xs text-red-200 whitespace-pre-wrap break-words",children:l.message||l.error||"Unknown error"}),l.raw&&e.jsx("pre",{className:"mt-2 p-2 bg-black/50 border border-secondary/40 font-mono text-[10px] overflow-auto",children:l.raw})]}):l?.ok===!0?e.jsxs("div",{className:"space-y-4",children:[e.jsxs("div",{className:"flex items-center gap-2",children:[e.jsx(_,{variant:"outline",className:"rounded-none border-secondary text-[9px]",children:l.cached?"CACHED":"FRESH"}),e.jsx("div",{className:"font-arcade text-xs text-primary",children:l.explanation?.title||h.title})]}),l.explanation?.summary&&e.jsx("div",{className:"p-3 bg-black/40 border border-secondary/50 rounded-none",children:e.jsx("div",{className:"font-terminal text-xs text-white",children:l.explanation.summary})}),Array.isArray(l.explanation?.groups)&&l.explanation.groups.length>0?e.jsx("div",{className:"space-y-2",children:l.explanation.groups.map((t,b)=>e.jsxs("div",{className:"p-3 bg-black/40 border border-secondary/50 rounded-none",children:[e.jsxs("div",{className:"flex items-center gap-2 mb-2",children:[e.jsx(E,{className:"w-4 h-4 text-primary"}),e.jsx("div",{className:"font-arcade text-xs text-primary",children:t?.name||`Group ${b+1}`})]}),e.jsxs("div",{className:"grid md:grid-cols-2 gap-3",children:[e.jsxs("div",{className:"space-y-1",children:[e.jsx("div",{className:"font-terminal text-[10px] text-muted-foreground",children:"What it is"}),e.jsx("div",{className:"font-terminal text-xs",children:t?.what_it_is})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("div",{className:"font-terminal text-[10px] text-muted-foreground",children:"How it works"}),e.jsx("div",{className:"font-terminal text-xs",children:t?.how_it_works})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("div",{className:"font-terminal text-[10px] text-muted-foreground",children:"Why it matters"}),e.jsx("div",{className:"font-terminal text-xs",children:t?.why_it_matters})]}),e.jsxs("div",{className:"space-y-1",children:[e.jsx("div",{className:"font-terminal text-[10px] text-muted-foreground",children:"Example"}),e.jsx("div",{className:"font-terminal text-xs",children:t?.example})]})]}),Array.isArray(t?.failure_modes)&&t.failure_modes.length>0&&e.jsxs("div",{className:"mt-3",children:[e.jsx("div",{className:"font-terminal text-[10px] text-muted-foreground mb-1",children:"Failure modes"}),e.jsx("ul",{className:"space-y-1 font-terminal text-xs",children:t.failure_modes.slice(0,8).map((f,y)=>e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-primary mt-[2px]",children:"-"}),e.jsx("span",{children:f})]},y))})]}),Array.isArray(t?.children)&&t.children.length>0&&e.jsxs("div",{className:"mt-3 p-2 bg-black/30 border border-secondary/40 rounded-none",children:[e.jsx("div",{className:"font-terminal text-[10px] text-muted-foreground mb-1",children:"Subgroups / Concepts"}),e.jsx("ul",{className:"space-y-1 font-terminal text-xs",children:t.children.slice(0,12).map((f,y)=>e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx(E,{className:"w-3 h-3 text-primary mt-[2px]"}),e.jsxs("span",{className:"text-white",children:[f?.name||"Unnamed",":"," ",e.jsxs("span",{className:"text-muted-foreground",children:[(f?.what_it_is||"").slice(0,160),(f?.what_it_is||"").length>160?"…":""]})]})]},y))}),e.jsx("div",{className:"font-terminal text-[10px] text-muted-foreground mt-2",children:"Tip: if you want deeper breakdown on a subgroup, we can add “click-to-expand” next."})]})]},b))}):e.jsx("div",{className:"font-terminal text-xs text-muted-foreground",children:"No groups returned. Try a different heading or add more detail under the heading."}),Array.isArray(l.explanation?.next_actions)&&l.explanation.next_actions.length>0&&e.jsxs("div",{className:"p-3 bg-black/40 border border-secondary/50 rounded-none",children:[e.jsx("div",{className:"font-arcade text-[10px] text-primary mb-2",children:"NEXT ACTIONS"}),e.jsx("ul",{className:"space-y-1 font-terminal text-xs",children:l.explanation.next_actions.slice(0,10).map((t,b)=>e.jsxs("li",{className:"flex items-start gap-2",children:[e.jsx("span",{className:"text-primary mt-[2px]",children:"-"}),e.jsx("span",{children:t})]},b))})]})]}):e.jsx("div",{className:"font-terminal text-xs text-muted-foreground",children:"Click “EXPLAIN THIS” to generate a breakdown for the selected section."}):e.jsx("div",{className:"font-terminal text-xs text-muted-foreground",children:"Pick a heading on the left. This will generate a nested breakdown (groups → subgroups → concepts) and explain how each part operates."})})]})]})}function oe({item:n,isSelected:s,onSelect:o}){const r=n.type==="dir";return e.jsxs("button",{onClick:()=>!r&&o(n.path),disabled:r,className:k("w-full text-left px-3 py-1.5 text-sm font-terminal flex items-center gap-2 transition-colors",r?"text-muted-foreground cursor-default":"hover:bg-primary/20 cursor-pointer",s&&"bg-primary/30 text-primary border-l-2 border-primary"),children:[r?e.jsx(w,{className:"w-4 h-4 text-yellow-500/70"}):e.jsx(F,{className:"w-4 h-4 text-primary/70"}),e.jsx("span",{className:"truncate",children:n.title})]})}function ie({section:n,selectedPath:s,onSelect:o}){const[r,x]=d.useState(!0),m=n.items.some(i=>i.path===s);return d.useEffect(()=>{m&&x(!0)},[m]),e.jsxs("div",{className:"mb-2",children:[e.jsxs("button",{onClick:()=>x(!r),className:"w-full text-left px-2 py-1 text-xs font-arcade uppercase text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors",children:[r?e.jsx(K,{className:"w-3 h-3"}):e.jsx(E,{className:"w-3 h-3"}),n.title]}),r&&e.jsx("div",{className:"ml-2 border-l border-secondary/50",children:n.items.map(i=>e.jsx(oe,{item:i,isSelected:i.path===s,onSelect:o},i.id))})]})}function ce({group:n,selectedPath:s,onSelect:o,defaultOpen:r=!1}){const[x,m]=d.useState(r),i=n.sections.some(c=>c.items.some(g=>g.path===s));return d.useEffect(()=>{i&&m(!0)},[i]),e.jsxs("div",{className:"mb-4",children:[e.jsxs("button",{onClick:()=>m(!x),className:"w-full text-left p-2 text-sm font-arcade uppercase bg-secondary/20 hover:bg-secondary/30 flex items-center gap-2 transition-colors border-l-2 border-primary/50",children:[x?e.jsx(J,{className:"w-4 h-4 text-primary"}):e.jsx(w,{className:"w-4 h-4 text-primary/70"}),n.title]}),x&&e.jsx("div",{className:"mt-1 ml-2",children:n.sections.map(c=>e.jsx(ie,{section:c,selectedPath:s,onSelect:o},c.id))})]})}function C({onClick:n,icon:s,label:o,copied:r}){return e.jsxs(j,{size:"sm",variant:"ghost",onClick:n,className:k("rounded-none border border-secondary hover:bg-primary hover:text-black text-[10px] font-arcade h-auto py-2 px-3 transition-all",r&&"bg-green-500/20 border-green-500 text-green-500"),children:[e.jsx(s,{className:"w-3 h-3 mr-1"}),r?"COPIED!":o]})}const le=`╔══════════════════════════════════════════════════════════════════════════════╗
║                    PT STUDY OS — CONCEPT MAP (v9.4)                         ║
╚══════════════════════════════════════════════════════════════════════════════╝

                         ┌─────────────────────────┐
                         │  PT Study OS Vision     │
                         │  ──────────────────     │
                         │ • Durable Context       │
                         │ • End-to-End Flows      │
                         │ • RAG-First             │
                         │ • Spaced Cards          │
                         │ • Deterministic Logging │
                         └────────┬────────────────┘
                                  │
                ┌─────────────────┼─────────────────┐
                ▼                 ▼                 ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────┐
        │  MAP Phase   │  │  LOOP Phase  │  │  WRAP Phase  │
        │ ──────────   │  │ ────────────  │  │ ────────────  │
        │ M0 Planning  │  │ M2 Prime     │  │ M6 Wrap      │
        │ M1 Entry     │  │ M3 Encode    │  │ Text Output: │
        │              │  │ M4 Build     │  │ • Exit Ticket│
        │              │  │ M5 Modes     │  │ • Session    │
        │              │  │              │  │   Ledger     │
        └──────────────┘  └──────┬───────┘  └──────────────┘
                                  │
                    ┌─────────────┼─────────────┐
                    ▼             ▼             ▼
            ┌──────────────┐ ┌──────────┐ ┌──────────────┐
            │ PEIRRO Cycle │ │ KWIK     │ │ Content      │
            │ ──────────   │ │ Encoding │ │ Engines      │
            │ Prepare      │ │ ──────   │ │ ────────     │
            │ Encode ────┐ │ │ • Sound  │ │ • Anatomy    │
            │ Interrogate│ │ │ • Func.  │ │   (OIANA+)   │
            │ Retrieve   │ │ │ • Image  │ │ • Concept    │
            │ Refine     │ │ │ • Reson. │ │   (5-step)   │
            │ Overlearn  │ │ │ • Lock   │ │ • LO Engine  │
            └──────────────┘ └──────────┘ └──────────────┘
                    │
                    └─────────────────────┐
                                          ▼
                        ┌──────────────────────────────┐
                        │   Core Rules (10 No-Skip)    │
                        │ ────────────────────────────  │
                        │ 1. M0 Planning (mandatory)    │
                        │ 2. Source-Lock (invariant)    │
                        │ 3. Seed-Lock (ask-first)      │
                        │ 4. Level Gating (L2→L4)       │
                        │ 5. PEIRRO Cycle (no skip)     │
                        │ 6. Exit Ticket (mandatory)    │
                        │ 7. Session Ledger (text)      │
                        │ 8. No Phantoms (invariant)    │
                        │ 9. Evidence Nuance Guardrails │
                        │ 10. Function Before Struct.   │
                        └──────────────────────────────┘

                         SYSTEM FLOW (Data Pipeline)
                    ┌──────────────────────────────┐
                    │   Material Ingestion         │
                    │   (pre-session, if needed)   │
                    │   → Tutor-Ready Packet       │
                    └──────────────┬───────────────┘
                                   ▼
                    ┌──────────────────────────────┐
                    │   TUTOR SYSTEM               │
                    │   (Custom GPT)               │
                    │ • Enforces M0-M6 flow        │
                    │ • Runs PEIRRO cycle          │
                    │ • KWIK encoding              │
                    │ • Selects content engines    │
                    └──────────────┬───────────────┘
                                   │
                ┌──────────────────┼──────────────┐
                ▼                  ▼              ▼
        ┌─────────────┐  ┌──────────┐  ┌──────────────┐
        │ RAG System  │  │ Anki     │  │ Exit Ticket+ │
        │ (source     │  │ Bridge   │  │ Session      │
        │  lock)      │  │ (cards)  │  │ Ledger (text)│
        └─────────────┘  └──────────┘  └───────┬──────┘
                                                 │
                    ┌────────────────────────────┴──────────────┐
                    ▼                                           ▼
        ┌────────────────────────┐          ┌──────────────────────────┐
        │ ANKI DESKTOP           │          │ BRAIN (Ingestion)        │
        │ User reviews cards on  │          │ • Parse Session Ledger   │
        │ spacing schedule       │          │ • Convert to JSON (v9.4) │
        │                        │          │ • Store session logs     │
        │                        │          │ • Produce Resume         │
        └────────────────────────┘          └──────────────┬───────────┘
                                                           │
                                                           ▼
                                    ┌────────────────────────────────┐
                                    │ DASHBOARD / PLANNER            │
                                    │ • Coverage maps                │
                                    │ • Spacing alerts (1-3-7-21)    │
                                    │ • Readiness scores             │
                                    │ • Weekly rotation (3+2)        │
                                    │ • Next session recommendations │
                                    └────────────────────────────────┘

                           DATA SCHEMAS & CONTRACTS
        ┌──────────────┬──────────────┬──────────────┬──────────────┐
        │ Session      │ RAG Document │ Card v1      │ Resume v1    │
        │ Ledger (Text)│ v1           │              │              │
        │ ──────────── │ ────────     │ ────────     │ ──────────── │
        │ Text output  │ • id         │ • deck       │ • generated_ │
        │ at Wrap:     │ • chunks[]   │ • guid       │   at         │
        │ • date       │ • images[]   │ • front      │ • readiness_ │
        │ • covered    │ • metadata{} │ • back       │   score      │
        │ • not_       │ • Function-  │ • tags[]     │ • recent_    │
        │   covered    │   first defs │ • source_    │   sessions[] │
        │ • weak_      │              │   refs[]     │ • topic_     │
        │   anchors    │ (Tutor-Ready │              │   coverage[] │
        │ • artifacts_ │  Packets use │ (source-     │ • gaps[]     │
        │   created    │  these)      │  tagged,     │ • recommend  │
        │ • timebox    │              │  dedupe by   │   ations[]   │
        │              │              │  deck+guid)  │              │
        │ Later        │              │              │ Produced via │
        │ converted    │              │              │ Brain        │
        │ to JSON v9.4 │              │              │ ingestion    │
        │ by Brain     │              │              │ (not tutor)  │
        └──────────────┴──────────────┴──────────────┴──────────────┘


                             OPERATING MODES
        ┌──────────┬──────────┬──────────┬──────────┬──────────┐
        │  CORE    │  SPRINT  │  LIGHT   │  QUICK   │  DRILL   │
        │ ──────── │ ──────── │ ──────── │ SPRINT   │ ──────── │
        │ Guided   │ Test-1st │ Micro    │ Timed    │ Deep     │
        │ w/       │ rapid    │ 10-15min │ 20-30min │ Practice │
        │ scaffolds│ gap find │ 1-3 cards│ burst    │ on 1     │
        │ Default  │ Exam prep│ Focused  │ 3-5 cards│ weak     │
        │ new mat. │ 3-5 cards│          │ mand.    │ anchor   │
        └──────────┴──────────┴──────────┴──────────┴──────────┘


                    WEEKLY ROTATION (3+2) — CLUSTER SPLIT
        ┌─────────────────────────────────────────────────────────┐
        │ CLUSTER A: 3 Technical Classes (Highest Cognitive Load) │
        │ CLUSTER B: 2 Lighter/Reading-Heavy Classes             │
        └─────────────────────────────────────────────────────────┘

                        WEEKLY RHYTHM (M-S rotation)
        ┌──────────────────────────────────────────────────────────┐
        │ Mon/Wed/Fri:                                             │
        │  → Cluster A (deep work/full session)                   │
        │  → 15 min Cluster B review (cross-review)               │
        │                                                          │
        │ Tue/Thu/Sat:                                             │
        │  → Cluster B (deep work/full session)                   │
        │  → 15 min Cluster A review (cross-review)               │
        │                                                          │
        │ Sunday:                                                  │
        │  → Weekly review + metacognition                        │
        │  → Wins / Gaps / Backlog / Load check                  │
        │  → Next-week cluster assignments                        │
        └──────────────────────────────────────────────────────────┘

                     SPACED RETRIEVAL (1-3-7-21 Heuristic)
        ┌──────────────────────────────────────────────────────────┐
        │ R1 (+1d)  → RSR adaptive or Manual R/Y/G               │
        │ R2 (+3d)  → Adjust: ≥80% +25% | 50-79% keep | <50% -50%│
        │ R3 (+7d)  → Min 12h, Max 60d bounds                    │
        │ R4 (+21d) → If no RSR captured, use standard 1-3-7-21  │
        └──────────────────────────────────────────────────────────┘

                    EVIDENCE GUARDRAILS (No Overclaiming)
        ┌─────────────────────────────────────────────────────────┐
        │ ✗ No numeric forgetting curve claims (cite studies)    │
        │ ✗ Dual coding = heuristic only, never "2x" guarantee   │
        │ ✗ Zeigarnik effect ≠ reliable memory guarantee         │
        │ ✗ RSR thresholds = adaptive (not fixed "85%")          │
        │ ✗ 3+2 rotation = distributed practice across classes   │
        │ ✗ Interleaving = discrimination within class only      │
        │ ✗ These are distinct (rotation ≠ interleaving)         │
        └─────────────────────────────────────────────────────────┘`;function be(){const n=U(),[s,o]=d.useState(null),[r,x]=d.useState(null),[m,i]=d.useState("content");d.useEffect(()=>{const u=new URLSearchParams(n).get("path");u&&o(u)},[n]);const{data:c,isLoading:g,error:l}=P({queryKey:["sop-index"],queryFn:()=>A.sop.getIndex()}),{data:p,isLoading:h,error:S}=P({queryKey:["sop-file",s],queryFn:()=>s?s==="concept-map"?{content:le}:A.sop.getFile(s):null,enabled:!!s}),t=d.useCallback(a=>{o(a),i("content");const u=`/tutor?path=${encodeURIComponent(a)}`;window.history.pushState({},"",u)},[]);d.useEffect(()=>{if(p?.content&&window.location.hash){const a=decodeURIComponent(window.location.hash.slice(1));setTimeout(()=>{const u=document.getElementById(a);u&&u.scrollIntoView({behavior:"smooth"})},100)}},[p?.content]);const b=d.useCallback(()=>{p?.content&&(navigator.clipboard.writeText(p.content),x("content"),setTimeout(()=>x(null),2e3))},[p?.content]),f=d.useCallback(()=>{if(s){const a=`${window.location.origin}/tutor?path=${encodeURIComponent(s)}`;navigator.clipboard.writeText(a),x("link"),setTimeout(()=>x(null),2e3)}},[s]),y=d.useCallback(()=>{if(s){const a=JSON.stringify({path:s,anchor:"",label:s.split("/").pop()?.replace(".md","")||s},null,2);navigator.clipboard.writeText(a),x("sopref"),setTimeout(()=>x(null),2e3)}},[s]),B=c?.default_group||"runtime",H=d.useMemo(()=>{if(!c||!s)return null;for(const a of c.groups)for(const u of a.sections){const N=u.items.find(G=>G.path===s);if(N)return N.title}return s.split("/").pop()},[c,s]);return e.jsx(W,{children:e.jsxs("div",{className:"min-h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4",children:[e.jsx("aside",{className:"w-full md:w-80 shrink-0",children:e.jsxs(v,{className:"min-h-[calc(100vh-140px)] bg-black/40 border-2 border-primary rounded-none flex flex-col",children:[e.jsx(L,{className:"border-b border-secondary p-3 sticky top-0 bg-black/95 z-10",children:e.jsxs(R,{className:"font-arcade text-sm flex items-center gap-2",children:[e.jsx(w,{className:"w-4 h-4"})," SOP EXPLORER"]})}),e.jsx("div",{className:"flex-1",children:e.jsxs("div",{className:"p-2 space-y-2",children:[e.jsxs("button",{onClick:()=>t("concept-map"),className:k("w-full text-left p-2 text-sm font-arcade uppercase bg-secondary/20 hover:bg-secondary/30 flex items-center gap-2 transition-colors border-l-2 mb-2",s==="concept-map"?"bg-primary/30 border-primary text-primary":"border-primary/50"),children:[e.jsx(T,{className:"w-4 h-4"}),"CONCEPT MAP"]}),g?e.jsx("div",{className:"flex items-center justify-center py-8",children:e.jsx(I,{className:"w-6 h-6 animate-spin text-primary"})}):l?e.jsx("div",{className:"text-red-500 text-sm p-4 font-terminal",children:"Failed to load SOP index"}):c?c.groups.map(a=>e.jsx(ce,{group:a,selectedPath:s,onSelect:t,defaultOpen:a.id===B},a.id)):null]})})]})}),e.jsxs(v,{className:"flex-1 bg-black/60 border-2 border-primary rounded-none flex flex-col",children:[e.jsxs("div",{className:"border-b border-secondary p-3 flex items-center justify-between gap-2 bg-black/40 sticky top-0 z-10",children:[e.jsx("div",{className:"font-arcade text-xs text-primary truncate",children:s?e.jsxs("span",{className:"flex items-center gap-2",children:[s==="concept-map"?e.jsx(T,{className:"w-4 h-4"}):e.jsx(F,{className:"w-4 h-4"}),s==="concept-map"?"PT STUDY SOP — CONCEPT MAP":H||s]}):e.jsx("span",{className:"text-muted-foreground",children:"SELECT A FILE TO VIEW"})}),s&&e.jsxs("div",{className:"flex gap-2 shrink-0",children:[e.jsx(C,{onClick:b,icon:Y,label:"CONTENT",copied:r==="content"}),e.jsx(C,{onClick:f,icon:Q,label:"LINK",copied:r==="link"}),e.jsx(C,{onClick:y,icon:T,label:"SOPREF",copied:r==="sopref"})]})]}),e.jsxs($,{value:m,onValueChange:a=>i(a),className:"flex-1 flex flex-col",children:[e.jsxs(q,{className:"bg-black/60 border-b border-secondary rounded-none p-1 w-full justify-start sticky top-0 z-10",children:[e.jsx(O,{value:"content",className:"rounded-none font-arcade text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black px-3",children:"CONTENT"}),e.jsx(O,{value:"breakdown",className:"rounded-none font-arcade text-[10px] data-[state=active]:bg-primary data-[state=active]:text-black px-3",disabled:!p?.content||s==="concept-map",children:"BREAKDOWN"})]}),e.jsx(M,{value:"content",className:"flex-1 mt-0",children:e.jsx("div",{className:"h-full",children:e.jsx("div",{className:"p-6",children:s?h?e.jsx("div",{className:"flex items-center justify-center py-12",children:e.jsx(I,{className:"w-8 h-8 animate-spin text-primary"})}):S?e.jsxs("div",{className:"text-red-500 font-terminal",children:["Failed to load file: ",s]}):p?.content?s==="concept-map"?e.jsx("div",{className:"p-6 overflow-auto h-full",children:e.jsx("pre",{className:"font-mono text-xs leading-relaxed text-primary whitespace-pre-wrap break-words bg-black/30 p-4 border border-secondary rounded",children:p.content})}):e.jsx("article",{className:`prose prose-invert prose-primary max-w-none font-terminal text-sm leading-relaxed\r
                        prose-headings:font-arcade prose-headings:text-primary prose-headings:border-b prose-headings:border-secondary/50 prose-headings:pb-2\r
                        prose-h1:text-xl prose-h2:text-lg prose-h3:text-base\r
                        prose-a:text-cyan-400 prose-a:no-underline hover:prose-a:underline\r
                        prose-code:bg-secondary/30 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-code:text-primary\r
                        prose-pre:bg-black/50 prose-pre:border prose-pre:border-secondary\r
                        prose-ul:list-disc prose-ol:list-decimal\r
                        prose-li:marker:text-primary\r
                        prose-blockquote:border-l-primary prose-blockquote:text-muted-foreground\r
                        prose-table:border-collapse prose-th:border prose-th:border-secondary prose-th:bg-secondary/20 prose-th:p-2\r
                        prose-td:border prose-td:border-secondary prose-td:p-2\r
                      `,children:e.jsx(V,{remarkPlugins:[X],components:{h1:({children:a,...u})=>{const N=String(a).toLowerCase().replace(/\s+/g,"-").replace(/[^\w-]/g,"");return e.jsx("h1",{id:N,...u,children:a})},h2:({children:a,...u})=>{const N=String(a).toLowerCase().replace(/\s+/g,"-").replace(/[^\w-]/g,"");return e.jsx("h2",{id:N,...u,children:a})},h3:({children:a,...u})=>{const N=String(a).toLowerCase().replace(/\s+/g,"-").replace(/[^\w-]/g,"");return e.jsx("h3",{id:N,...u,children:a})},h4:({children:a,...u})=>{const N=String(a).toLowerCase().replace(/\s+/g,"-").replace(/[^\w-]/g,"");return e.jsx("h4",{id:N,...u,children:a})}},children:p.content})}):e.jsx("div",{className:"text-muted-foreground font-terminal",children:"No content available"}):e.jsxs("div",{className:"text-center py-12 font-terminal text-muted-foreground",children:[e.jsx(w,{className:"w-12 h-12 mx-auto mb-4 text-primary/50"}),e.jsx("p",{children:"SELECT A FILE FROM THE TREE"}),e.jsx("p",{className:"text-xs mt-2",children:"Browse your Study Operating Procedures"})]})})})}),e.jsx(M,{value:"breakdown",className:"flex-1 mt-0",children:e.jsx("div",{className:"p-4",children:s&&p?.content?e.jsx(ne,{path:s,content:p.content}):e.jsx("div",{className:"font-terminal text-xs text-muted-foreground p-3",children:"Select a SOP file first."})})})]}),s&&e.jsx("div",{className:"border-t border-secondary p-2 bg-black/40",children:e.jsx("div",{className:"text-[10px] font-mono text-muted-foreground truncate",children:s==="concept-map"?"PT Study SOP — Concept Map (ASCII Visual)":s})})]})]})})}export{be as default};
