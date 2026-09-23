import type { AIBOMResource } from '../types/aibom';
import { buildFieldRows } from './compareFields';

function withModel(name: string, version: string): AIBOMResource {
  return { spec: { data: { model: { name, version } } } };
}

describe('buildFieldRows', () => {
  it('marks a field as not differing when all items agree', () => {
    const rows = buildFieldRows([withModel('granite', '1.0'), withModel('granite', '1.0')]);
    const modelName = rows.find((r) => r.label === 'Model Name');
    expect(modelName?.differs).toBe(false);
    expect(modelName?.values).toEqual(['granite', 'granite']);
  });

  it('marks a field as differing when values disagree', () => {
    const rows = buildFieldRows([withModel('granite', '1.0'), withModel('granite', '2.0')]);
    const modelVersion = rows.find((r) => r.label === 'Model Version');
    expect(modelVersion?.differs).toBe(true);
    expect(modelVersion?.values).toEqual(['1.0', '2.0']);
  });

  it('does not flag unrelated fields as differing', () => {
    const rows = buildFieldRows([withModel('granite', '1.0'), withModel('granite', '2.0')]);
    const modelName = rows.find((r) => r.label === 'Model Name');
    expect(modelName?.differs).toBe(false);
  });

  it('computes dataset drift independently per item', () => {
    const clean: AIBOMResource = {
      spec: { data: { dataset: { auto_detected: [{ matches_declared: true }] } } },
    };
    const drifted: AIBOMResource = {
      spec: { data: { dataset: { auto_detected: [{ matches_declared: false }] } } },
    };
    const rows = buildFieldRows([clean, drifted]);
    const drift = rows.find((r) => r.label === 'Dataset Drift');
    expect(drift?.values).toEqual(['false', 'true']);
    expect(drift?.differs).toBe(true);
  });

  it('scales to more than two items', () => {
    const rows = buildFieldRows([withModel('a', '1'), withModel('b', '1'), withModel('c', '1')]);
    const modelName = rows.find((r) => r.label === 'Model Name');
    expect(modelName?.values).toEqual(['a', 'b', 'c']);
    expect(modelName?.differs).toBe(true);
  });
});
