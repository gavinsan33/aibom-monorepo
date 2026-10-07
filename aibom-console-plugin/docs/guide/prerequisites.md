# Prerequisites

- **The webhook's CRD and view role.** `aibom-webhook-service`'s CRD (`aiboms.aibom.io`) and its `aibom-view` aggregated `ClusterRole` must be installed on the cluster. A user with `view` on a namespace can then browse AIBOMs there through this plugin, including the Telemetry charts, with no extra RBAC grant. The charts read each AIBOM's stored `AIBOMTelemetry` object, which the same role covers.
- **An OpenShift cluster** (4.12+, `ConsolePlugin` CRD v1) and `oc`/`kubectl`, to run or deploy the plugin.
- **Node.js and [yarn](https://yarnpkg.com)**, to build the plugin.
