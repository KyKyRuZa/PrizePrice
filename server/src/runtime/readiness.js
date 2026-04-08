const readinessState = {
  ready: false,
  reason: "BOOTING",
};

export function setReady() {
  readinessState.ready = true;
  readinessState.reason = "READY";
}

export function setNotReady(reason = "NOT_READY") {
  readinessState.ready = false;
  readinessState.reason = String(reason || "NOT_READY");
}

export function getReadinessState() {
  return {
    ready: readinessState.ready,
    reason: readinessState.reason,
  };
}

