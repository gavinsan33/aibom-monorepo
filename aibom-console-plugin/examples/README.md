# Sample AIBOMs

Fake `aibom.io/v1alpha1` `AIBOM` custom resources for exercising this
plugin's List, Detail, and Compare views without needing a real
`aibom-webhook-service`-instrumented training/serving run.

- `aibom-granite-lora-finetune-run1.yaml` — a completed LoRA fine-tune,
  int4, 2x A100, dataset matches its declared name, full hardware telemetry.
- `aibom-granite-lora-finetune-run2.yaml` — a second run of the *same job*
  with different config (int8/qlora, 1x H100, higher learning rate) and a
  dataset that **does not** match its declared name (`matches_declared:
  false`) — pairs with run1 to exercise the List view's drift filter and
  the Compare view's divergent-field highlighting. Also `OOMKilled`, to
  exercise the pod-status coloring.
- `aibom-vllm-inference.yaml` — a vLLM serving workload, to exercise the
  Detail view's Inference section/Inference Performance table and the
  Telemetry tab's vLLM chart gating (`inference.serving_engine === 'vllm'`).

## Apply

These default to the `project-gavin-test` namespace — edit `metadata.namespace`
in each file, or override on the command line:

```sh
oc apply -n <your-namespace> -f examples/
```

You'll need `aibom-webhook-service`'s CRD (`aiboms.aibom.io`) already
installed on the cluster, and create access on `aiboms.aibom.io` in the
target namespace (the same access a workload's postprocess Job would have).

## Notes

- **`spec` is immutable once created** (the CRD enforces this with a CEL
  validation rule) — to change one of these after applying, `oc delete` and
  re-apply rather than editing in place.
- The pod names/nodes referenced here are fake and don't correspond to real
  cluster resources, so the Detail view's **Telemetry** tab will correctly
  show "no data" for these — that tab queries live Prometheus for the named
  pods, which don't actually exist. Everything else (List filtering/sorting,
  Detail's Overview tab, Compare) works fully offline against just the CR
  data.
