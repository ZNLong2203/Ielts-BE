import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IJwtPayload } from 'src/interface/jwt-payload.interface';

// This class is responsible for validating the token and extracting the user information from the token that received from the client.
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey:
        configService.get<string>('JWT_ACCESS_SECRET') || 'accessSecret',
    });
  }

  async validate(payload: IJwtPayload) {
    const { id, full_name, email, role } = payload;
    // khi return về, sẽ được gán vào req.user
    return {
      id,
      full_name,
      email,
      role,
    };
  }
}
