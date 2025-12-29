import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

/**
 * Migration: Add allowed_redirect_domains to apps table
 * @description Adds domain whitelist for OAuth redirect URI validation
 */
export class AddAllowedRedirectDomainsToApps1735441300000
  implements MigrationInterface
{
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'common.apps',
      new TableColumn({
        name: 'allowed_redirect_domains',
        type: 'jsonb',
        isNullable: true,
        default: "'[]'",
        comment:
          'Whitelist of allowed OAuth redirect domains. Prevents open redirect vulnerabilities. Example: ["https://example.com", "http://localhost:3000"]',
      })
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('common.apps', 'allowed_redirect_domains');
  }
}
