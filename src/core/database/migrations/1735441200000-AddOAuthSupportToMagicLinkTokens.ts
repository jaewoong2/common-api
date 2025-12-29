import { MigrationInterface, QueryRunner, TableColumn, TableIndex } from 'typeorm';

/**
 * Migration: Add OAuth support to magic_link_tokens table
 * @description Adds provider and user_id columns to support OAuth authorization codes
 * alongside existing magic link functionality
 */
export class AddOAuthSupportToMagicLinkTokens1735441200000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add provider column
    await queryRunner.addColumn(
      'common.magic_link_tokens',
      new TableColumn({
        name: 'provider',
        type: 'varchar',
        length: '50',
        isNullable: true,
        default: "'magic-link'",
        comment:
          "Provider type: 'magic-link', 'google', 'kakao', etc. Distinguishes token types",
      })
    );

    // Add user_id column
    await queryRunner.addColumn(
      'common.magic_link_tokens',
      new TableColumn({
        name: 'user_id',
        type: 'uuid',
        isNullable: true,
        comment:
          'User ID for OAuth flows. Magic link flows use email instead.',
      })
    );

    // Create index on provider for faster queries
    await queryRunner.createIndex(
      'common.magic_link_tokens',
      new TableIndex({
        name: 'IDX_magic_link_tokens_provider',
        columnNames: ['provider'],
      })
    );

    // Create index on user_id for faster queries
    await queryRunner.createIndex(
      'common.magic_link_tokens',
      new TableIndex({
        name: 'IDX_magic_link_tokens_user_id',
        columnNames: ['user_id'],
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.dropIndex(
      'common.magic_link_tokens',
      'IDX_magic_link_tokens_user_id'
    );
    await queryRunner.dropIndex(
      'common.magic_link_tokens',
      'IDX_magic_link_tokens_provider'
    );

    // Drop columns
    await queryRunner.dropColumn('common.magic_link_tokens', 'user_id');
    await queryRunner.dropColumn('common.magic_link_tokens', 'provider');
  }
}
