import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { IJwtPayload } from 'src/interface/jwt-payload.interface';

// Lớp này chịu trách nhiệm xác thực token và trích xuất thông tin người dùng từ token nhận được từ client.
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
    // Khi return về, sẽ được gán vào req.user
    return {
      id,
      full_name,
      email,
      role,
    };
  }
}
