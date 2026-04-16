import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { query } from '@/lib/db/postgres';

/**
 * Global Platform Audit Interceptor.
 * Automatically captures and persists all mutative executive actions taken on the Control Plane.
 * Ensures an immutable trail of "who did what and when" for security compliance.
 */
@Injectable()
export class AuditLogInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, superAdmin } = request;

    // Only log mutative actions (POST, PUT, DELETE, PATCH)
    const isMutation = ['POST', 'PUT', 'DELETE', 'PATCH'].includes(method);

    return next.handle().pipe(
      tap(async () => {
        if (isMutation && superAdmin) {
          try {
            await query('SYSTEM', 
              'INSERT INTO platform_audit_logs (actor_id, type, payload, ip_address) VALUES ($1, $2, $3, $4)',
              [
                superAdmin.sub, 
                `API_${method}_${url.toUpperCase().replace(/\//g, '_')}`, 
                JSON.stringify(request.body),
                request.ip || '0.0.0.0'
              ]
            );
          } catch (err) {
            console.error('FAILED TO PERSIST AUDIT LOG:', err);
          }
        }
      }),
    );
  }
}
