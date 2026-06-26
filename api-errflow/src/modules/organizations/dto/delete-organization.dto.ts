import { IsString, IsNotEmpty } from 'class-validator';

export class DeleteOrganizationDto {
  @IsString()
  @IsNotEmpty()
  password: string;

  @IsString()
  @IsNotEmpty()
  confirmText: string;
}
