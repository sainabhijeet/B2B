import { IsInt, IsObject, Max, Min } from 'class-validator';

export class SaveOnboardingStepDto {
  @IsInt()
  @Min(1)
  @Max(7)
  step: number;

  @IsObject()
  data: Record<string, unknown>;
}
