import { Module } from '@nestjs/common';
import { AuthModule } from '@thallesp/nestjs-better-auth';
import { auth } from '@mykwatta/modules/identity/auth';
import { IdentityController } from '@mykwatta/modules/identity/controllers';
import { IdentityService } from '@mykwatta/modules/identity/services';

@Module({
  imports: [
    AuthModule.forRoot({
      auth,
      disableBodyParser: true,
    }),
  ],
  controllers: [IdentityController],
  providers: [IdentityService],
  exports: [IdentityService, AuthModule],
})
export class IdentityModule {}
