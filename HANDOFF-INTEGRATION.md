# Classmate handoff integration

User-provided archive: `3S人形物联网服务系统_网页完整交接包_20260905.zip`.
Verified SHA256: `02715CCE8747897B1B357E88950E8B8605FCF80855BA0A6CC65260025FE49BC4`.

Reused the handoff's procedural pose definitions/interpolation, three engineering render views, and gzip mesh files. All 26 original STL files matched the existing repository hashes, so no duplicate raw mesh set was imported. The existing URDF and model attribution remain in `public/humanoid`.

`classmateMotion.ts` adapts the pose code. `StudioViewer.jsx` adapts the compressed-first loading approach to the installed three-argument URDF loader mesh callback, adds abort/timeout handling and raw-mesh fallback, and applies geometric foot-height compensation after joint animation. Exploded view uses local mesh offsets. These are visual explanations, not physics, telemetry or deployed RL control.

The new homepage studio is click-to-load, with three static views and a direct link onward to system architecture. Renders are copied from the supplied package; original model licensing and attribution continue to apply. The handoff's deployment files, research scripts, policy weights, duplicate site build and remote repository configuration were not applied to this site.

Checks: `node scripts/studio-qa.mjs` tests desktop/mobile mesh loading, deferred network requests, all actions, anchoring, exploded view, pause, camera reset and static view selection. `npm run qa:premium` checks surrounding layout; existing service QA remains applicable.
