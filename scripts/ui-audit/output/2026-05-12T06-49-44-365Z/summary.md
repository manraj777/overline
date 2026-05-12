# UI Audit — 2026-05-12T06-49-44-365Z

User base: `http://localhost:3000`  Admin base: `http://localhost:3002`

| App | Mode | Route | Status | Final URL | Contrast Issues | Error |
|---|---|---|---|---|---|---|
| user | light | `/` | 200 | `http://localhost:3000/` | 3 |  |
| user | dark | `/` | 200 | `http://localhost:3000/` | 8 |  |
| user | light | `/explore` | 200 | `http://localhost:3000/explore` | 10 |  |
| user | dark | `/explore` | 200 | `http://localhost:3000/explore` | 13 |  |
| user | light | `/blog` | 200 | `http://localhost:3000/blog` | 2 |  |
| user | dark | `/blog` | 200 | `http://localhost:3000/blog` | 5 |  |
| user | light | `/privacy` | 200 | `http://localhost:3000/privacy` | 4 |  |
| user | dark | `/privacy` | 200 | `http://localhost:3000/privacy` | 3 |  |
| user | light | `/terms` | 200 | `http://localhost:3000/terms` | 2 |  |
| user | dark | `/terms` | 200 | `http://localhost:3000/terms` | 1 |  |
| user | light | `/auth/login` | 200 | `http://localhost:3000/auth/login` | 2 |  |
| user | dark | `/auth/login` | 200 | `http://localhost:3000/auth/login` | 12 |  |
| user | light | `/auth/signup` | 200 | `http://localhost:3000/auth/signup` | 2 |  |
| user | dark | `/auth/signup` | 200 | `http://localhost:3000/auth/signup` | 16 |  |
| user | light | `/bookings` | 200 | `http://localhost:3000/auth/login?redirect=/bookings` | 2 |  |
| user | dark | `/bookings` | 200 | `http://localhost:3000/auth/login?redirect=/bookings` | 12 |  |
| user | light | `/profile` | 200 | `http://localhost:3000/auth/login?redirect=/profile` | 2 |  |
| user | dark | `/profile` | 200 | `http://localhost:3000/auth/login?redirect=/profile` | 12 |  |
| user | light | `/notifications` | 500 | `http://localhost:3000/notifications` | 0 |  |
| user | dark | `/notifications` | 500 | `http://localhost:3000/notifications` | 0 |  |
| user | light | `/shops` | 200 | `http://localhost:3000/explore` | 5 |  |
| user | dark | `/shops` | 200 | `http://localhost:3000/explore` | 15 |  |
| user | light | `/shops/undefined` | 200 | `http://localhost:3000/explore` | 10 |  |
| user | dark | `/shops/undefined` | 200 | `http://localhost:3000/explore` | 15 |  |
| admin | light | `/` | 500 | `http://localhost:3002/` | 0 |  |
| admin | dark | `/` | 500 | `http://localhost:3002/` | 0 |  |
| admin | light | `/login` | 500 | `http://localhost:3002/login` | 0 |  |
| admin | dark | `/login` | 500 | `http://localhost:3002/login` | 0 |  |
| admin | light | `/privacy` | 500 | `http://localhost:3002/privacy` | 0 |  |
| admin | dark | `/privacy` | 500 | `http://localhost:3002/privacy` | 0 |  |
| admin | light | `/terms` | 500 | `http://localhost:3002/terms` | 0 |  |
| admin | dark | `/terms` | 500 | `http://localhost:3002/terms` | 0 |  |
| admin | light | `/support` | 500 | `http://localhost:3002/support` | 0 |  |
| admin | dark | `/support` | 500 | `http://localhost:3002/support` | 0 |  |