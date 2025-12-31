import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Algorithm } from 'jsonwebtoken';
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
import { JwtStrategy } from './strategies/jwt.strategy';

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
      useFactory: (configService: ConfigService) => {
        const secret =
          configService.get<string>('JWT_SECRET') ||
          configService.get<string>('JWT_SECRET_KEY') ||
          configService.get<string>('jwt.secret') ||
          'your-secret-key';

        const algorithm =
          (configService.get<string>('JWT_ALGORITHM') ||
            configService.get<string>('jwt.algorithm') ||
            'HS256') as Algorithm;

        return {
          secret,
          signOptions: { expiresIn: '15m', algorithm },
        };
      },
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
    JwtStrategy,
  ],
  exports: [AuthService, RefreshTokenRepository, MagicLinkTokenRepository],
})
export class AuthModule {}
