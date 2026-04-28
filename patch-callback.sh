sed -i '' "s/router.replace('\/login?error=google_auth_failed');/router.replace('\/login?error=google_auth_failed\&details=missing_params');/g" apps/admin-web/src/pages/auth/google/callback.tsx
sed -i '' "s/} catch {/\} catch (e) {/g" apps/admin-web/src/pages/auth/google/callback.tsx
sed -i '' "s/router.replace('\/login?error=google_auth_failed&details=missing_params');/console.error(e); router.replace('\/login?error=google_auth_failed\&details=parse_error');/g" apps/admin-web/src/pages/auth/google/callback.tsx
