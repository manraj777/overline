# 🛠️ Overline: Feature Development Workflow

> [!TIP]
> This workflow guides AI feature assistants on how to properly implement new features end-to-end across the Monorepo without breaking existing logic.

## Step 1: Database Updates (If Required)
1. Modify `apps/backend/prisma/schema.prisma`.
2. Run `npx prisma format` to ensure syntax is correct.
3. Run `npx prisma db push` (for local development) or `npx prisma migrate dev --name <feature_name>`.
4. Run `npx prisma generate` to update the Prisma Client.

## Step 2: Backend Implementation (NestJS)
1. **DTOs**: Create or update Data Transfer Objects in `apps/backend/src/modules/<module>/dto/`. Use `class-validator` to ensure strict payload validation (preventing injection attacks).
2. **Services**: Implement core business logic in `<module>.service.ts`. Always use transactions (`this.prisma.$transaction`) if modifying multiple tables.
3. **Controllers**: Add routes in `<module>.controller.ts`. Ensure strict role guards (`@Roles(UserRole.SUPER_ADMIN)` etc.) are applied if the endpoint is sensitive.
4. **Swagger**: Add `@ApiOperation` and `@ApiProperty` to document the API.

## Step 3: Frontend Integration (Next.js / React Native)
1. **API Client**: Ensure Axios points to the correct backend (`http://localhost:3333/api` locally).
2. **Web (`admin-web`)**:
   - Use Tailwind CSS for styling.
   - Build UI components inside `src/components/ui/`.
3. **Mobile (`mobile-user` / `mobile-admin`)**:
   - Do NOT use React Native Navigation DOM dependencies. Stick to `expo-router` or standard `@react-navigation/native` depending on the project structure.
   - Use `Nativewind` for styling (`className="bg-indigo-600"`).
   - Test UI with `Vibration.vibrate()` and `react-native-sound` where haptic/audio feedback is needed.

## Step 4: Security Verification
> [!IMPORTANT]
> - Ensure all user inputs are sanitized.
> - Ensure mobile views gracefully handle 403 Forbidden errors from the API.
> - Never expose sensitive user data (like passwords, exact auth tokens) in Redux/Zustand state logging.
