# K-MAPS Domain Workers

This directory is the clean Worker structure for the multi-DB system.

The existing `functions/` directory remains the Pages compatibility layer so
current Angular and Ionic routes keep working. Existing implementation code has
been moved to `legacy/functions/`; each file in `functions/` is now a thin
re-export shim.

## Rule

Each domain Worker owns exactly one D1 database binding:

| Domain | Worker directory | Owned binding | Database |
| --- | --- | --- | --- |
| Quran | `workers/quran` | `DB_QR` | `km_quran` |
| Arabic Linguistics | `workers/ar-linguistics` | `DB_AL` | `km_arabic_linguistic` |
| Arabic Learning | `workers/arabic` | `DB_AR` | `km_arabic` |
| Worldview | `workers/worldview` | `DB_WV` | `km_worldview` |
| Planner | `workers/planner` | `DB_PL` | `km_planner` |
| Core | `workers/core` | `DB_CORE` | `km_core` |
| Content | `workers/content` | `DB_CM` | `km_content` |

Domain Workers may use service bindings to call other domain Workers. They must
not bind or query another domain's D1 database directly.

## Migration Flow

1. Keep the public route in `functions/`.
2. Move the real implementation into the matching domain Worker.
3. Make the compatibility route call the domain Worker.
4. Verify the public response JSON stays compatible.
5. Repeat one domain at a time.
