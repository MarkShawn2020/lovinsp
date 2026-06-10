import { describe, expect, it } from 'vitest';
import { transformJsx } from '@/core/src/server/transform/transform-jsx';

describe('transformJsx', () => {
  it('inserts inspector attributes after TSX generic parameters', () => {
    const code = `
const node = (
  <List<API.NoticeIconItem>
    className={styles.list}
    dataSource={list}
  />
);
`;

    const transformed = transformJsx(code, 'src/NoticeList.tsx', []);

    expect(transformed).toContain(
      '<List<API.NoticeIconItem> data-insp-path="src/NoticeList.tsx:3:3:List"'
    );
    expect(transformed).not.toContain('data-insp-path="src/NoticeList.tsx:3:3:List"<');
  });
});
