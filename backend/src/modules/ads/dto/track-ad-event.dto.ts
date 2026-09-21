import { IsIn, IsUUID } from 'class-validator';

export class TrackAdEventDto {
  /** Creative id returned from GET /ads payloads (`id` field). */
  @IsUUID()
  creativeId: string;

  @IsIn(['AD_VIEW', 'AD_CLICK'])
  eventType: 'AD_VIEW' | 'AD_CLICK';
}
