# Exhibition design revision

## Robotics typography and motion follow-up

Inspected https://www.figure.ai/ and https://www.unitree.com/ in a 1440px desktop browser. Figure rendered its visible editorial headings in PP Neue Machina Plain at 28px/400 with normal letter spacing, supported by muted video elements. Unitree's inspected Chinese headings used medium weights with normal letter spacing and system/PingFang fallbacks. Boston Dynamics returned an access-verification page and was excluded from design conclusions. No proprietary font assets were copied.

Applied: display headings use short phrases without sentence-final punctuation; Chinese display weight is 480–500 with near-natural spacing. Headline reveal, scroll-driven film expansion and keyed architecture/application transitions provide distinct interaction cues. The film scales only within 0.94–1.0, scroll remains native, phone scaling is disabled and reduced-motion preferences suppress animation. Full paragraphs retain normal punctuation.

Reviewed live official pages on 2026-09-05 at a 1440px browser viewport:

- Apple iPhone: https://www.apple.com/iphone/ — visible main title used 80px/600; major chapter titles 56px/600; supporting feature headings 17px. The useful pattern is distinct display/body hierarchy and product-led sections.
- Tencent: https://www.tencent.com/zh-cn/ — opening title used 85px, major audience titles 120px, supporting narrative titles 62px; opening video was muted. The useful pattern is large editorial chapters supported by imagery.

These observations describe those pages at the inspection time, not universal brand rules. No proprietary fonts, code or media were copied into this project.

Applied changes: two-line product title, neutral typography accent, removal of decorative rings/floating hero labels, deliberate film chapter using the existing attributed platform video, lighter architecture navigation and open editorial columns for innovation. Operational cards remain in the service workspace where grouping helps decisions.

Film playback is explicitly requested by the visitor, muted, and paused offscreen or when the document becomes hidden. Existing reduced-motion support and service semantics remain. The font subset was regenerated for new copy. QA checks both the film controls and the full service workflow.
