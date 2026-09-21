import { Injectable, UnauthorizedException } from '@nestjs/common';
import { getAuth } from 'firebase-admin/auth';
import { FirebaseAdminLifecycleService } from '../../modules/system-config/firebase-admin-lifecycle.service';

@Injectable()
export class FirebaseAuthService {
  constructor(private readonly firebaseLifecycle: FirebaseAdminLifecycleService) {}

  async verifyIdToken(idToken: string): Promise<{ uid: string; phone: string | null }> {
    const app = await this.firebaseLifecycle.getAppForAuth();
    const auth = getAuth(app);
    try {
      const decoded = await auth.verifyIdToken(idToken, true);
      return {
        uid: decoded.uid,
        phone: decoded.phone_number ?? null,
      };
    } catch {
      throw new UnauthorizedException('Invalid Firebase token.');
    }
  }
}
