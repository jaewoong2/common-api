import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UserModule } from '../user/user.module';
import { RefreshTokenRepository } from './repositories/refresh-token.repository';
import { MagicLinkTokenRepository } from './repositories/magic-link-token.repository';
import { OAuthProviderRepository } from './repositories/oauth-provider.repository';
import { GoogleStrategy } from './strategies/google.strategy';
import { KakaoStrategy } from './strategies/kakao.strategy';
import { RefreshTokenEntity } from '../../database/entities/refresh-token.entity';
import { MagicLinkTokenEntity } from '../../database/entities/magic-link-token.entity';
import { OAuthProviderEntity } from '../../database/entities/oauth-provider.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      RefreshTokenEntity,
      MagicLinkTokenEntity,
      OAuthProviderEntity,
    ]),
    PassportModule.register({ session: false, defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET', 'your-secret-key'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
    UserModule,
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    RefreshTokenRepository,
    MagicLinkTokenRepository,
    OAuthProviderRepository,
    GoogleStrategy,
    KakaoStrategy,
  ],
  exports: [AuthService, RefreshTokenRepository, MagicLinkTokenRepository],
})
export class AuthModule {}
