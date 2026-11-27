import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '@mykwatta/modules/identity/auth';
import { IdentityController } from '@mykwatta/modules/identity/controllers';
import { IdentityService } from '@mykwatta/modules/identity/services';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      // Nest is created with bodyParser: false so Better Auth can read /api/auth itself.
      // This re-adds JSON and urlencoded parsers for every other route, and keeps
      // req.rawBody for the Stripe webhook signature check.
      bodyParser: {
        rawBody: true,
      },
    }),
  ],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService, AuthModule],
})
export class IdentityModule {}
