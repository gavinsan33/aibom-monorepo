import type { AIBOMResource } from '../types/aibom';
import { applyFilter } from './filter';

function named(name: string, resource: Omit<AIBOMResource, 'metadata'>): AIBOMResource {
  return { ...resource, metadata: { name } };
}

function testAIBOMs(): AIBOMResource[] {
  return [
    named('run-a', {
      spec: {
        jobName: 'job-a',
        experimentIntent: 'training',
        data: {
          model: {
            name: 'granite-3.0-8b',
            quantization: 'none',
            architecture: 'gpt',
            framework: 'pytorch',
          },
          source_code: { git_branch: 'main', git_repository: 'org/repo-a' },
          environment: { gpu_type: 'A100' },
          training: { optimizer: 'adamw' },
          dataset: {
            declared: { name: 'alpaca' },
            auto_detected: [{ dataset_name: 'alpaca', matches_declared: true }],
          },
        },
      },
    }),
    named('run-b', {
      spec: {
        jobName: 'job-b',
        experimentIntent: 'sft',
        data: {
          model: {
            name: 'granite-3.0-8b',
            quantization: 'int4',
            architecture: 'gpt',
            framework: 'pytorch',
          },
          source_code: { git_branch: 'feature/x', git_repository: 'org/repo-a' },
          environment: { gpu_type: 'H100' },
          fine_tuning: { adaptation_method: 'lora' },
          dataset: {
            declared: { name: 'alpaca' },
            auto_detected: [{ dataset_name: 'dolly', matches_declared: false }],
          },
        },
      },
    }),
    named('run-c', {
      spec: {
        jobName: 'job-c',
        experimentIntent: 'inference',
        data: {
          model: { name: 'llama-3-70b', quantization: 'int8', architecture: 'llama' },
          environment: { gpu_type: 'A100' },
          inference: { serving_engine: 'vllm' },
        },
      },
    }),
  ];
}

const names = (items: AIBOMResource[]): (string | undefined)[] =>
  items.map((i) => i.metadata?.name);

describe('applyFilter', () => {
  it('filters by model', () => {
    expect(applyFilter(testAIBOMs(), { model: 'granite-3.0-8b' })).toHaveLength(2);
  });

  it('is case-insensitive', () => {
    expect(applyFilter(testAIBOMs(), { model: 'GRANITE-3.0-8B' })).toHaveLength(2);
  });

  it('filters by intent', () => {
    expect(names(applyFilter(testAIBOMs(), { intent: 'inference' }))).toEqual(['run-c']);
  });

  it('filters by quantization', () => {
    expect(names(applyFilter(testAIBOMs(), { quantization: 'int4' }))).toEqual(['run-b']);
  });

  it('ANDs multiple filters together', () => {
    expect(names(applyFilter(testAIBOMs(), { model: 'granite-3.0-8b', intent: 'sft' }))).toEqual([
      'run-b',
    ]);
  });

  it('returns everything when no filter is set', () => {
    expect(applyFilter(testAIBOMs(), {})).toHaveLength(3);
  });

  it('filters by GPU type', () => {
    expect(applyFilter(testAIBOMs(), { gpuType: 'a100' })).toHaveLength(2);
  });

  it('filters by architecture', () => {
    expect(names(applyFilter(testAIBOMs(), { architecture: 'llama' }))).toEqual(['run-c']);
  });

  it('filters by job name', () => {
    expect(names(applyFilter(testAIBOMs(), { jobName: 'job-b' }))).toEqual(['run-b']);
  });

  it('filters by git branch', () => {
    expect(names(applyFilter(testAIBOMs(), { gitBranch: 'feature/x' }))).toEqual(['run-b']);
  });

  it('filters by serving engine', () => {
    expect(names(applyFilter(testAIBOMs(), { servingEngine: 'vllm' }))).toEqual(['run-c']);
  });

  it('excludes items with no inference block when filtering by serving engine', () => {
    expect(applyFilter(testAIBOMs(), { servingEngine: 'does-not-exist' })).toHaveLength(0);
  });

  it('filters by adaptation method', () => {
    expect(names(applyFilter(testAIBOMs(), { adaptationMethod: 'lora' }))).toEqual(['run-b']);
  });

  it('filters by optimizer', () => {
    expect(names(applyFilter(testAIBOMs(), { optimizer: 'adamw' }))).toEqual(['run-a']);
  });

  it('drift-only keeps items whose auto-detected dataset disagrees with declared', () => {
    expect(names(applyFilter(testAIBOMs(), { driftOnly: true }))).toEqual(['run-b']);
  });
});
