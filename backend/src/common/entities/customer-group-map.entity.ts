import { Entity, JoinColumn, ManyToOne, PrimaryColumn } from 'typeorm';
import { Customer } from './customer.entity';
import { CustomerGroup } from './customer-group.entity';

@Entity({ name: 'customer_group_map' })
export class CustomerGroupMap {
  @PrimaryColumn({ name: 'customer_id', type: 'uuid' })
  customerId: string;

  @ManyToOne(() => Customer, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @PrimaryColumn({ name: 'group_id', type: 'uuid' })
  groupId: string;

  @ManyToOne(() => CustomerGroup, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'group_id' })
  group: CustomerGroup;
}
