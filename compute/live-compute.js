(function (scope) {
  "use strict";
  function validateJob(job) {
    if (!job || job.type !== "dot-batch-v1" || !Array.isArray(job.query) ||
        job.query.length < 1 || job.query.length > 64 ||
        !job.query.every(validNumber) || !Array.isArray(job.vectors) ||
        job.vectors.length < 1 || job.vectors.length > 256) {
      throw new Error("Invalid or oversized vector task");
    }
    const seen = new Set();
    for (const row of job.vectors) {
      if (!row || typeof row.id !== "string" || !/^[\w.-]{1,40}$/.test(row.id) ||
          seen.has(row.id) || !Array.isArray(row.values) ||
          row.values.length !== job.query.length ||
          !row.values.every(validNumber)) {
        throw new Error("Invalid vector row");
      }
      seen.add(row.id);
    }
    return true;
  }
  function validNumber(n) {
    return typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 1000;
  }
  function compute(job) {
    validateJob(job);
    return job.vectors.map(row => {
      let score = 0;
      for (let i=0; i<job.query.length; i++) score += job.query[i] * row.values[i];
      return {id: row.id, score: Math.round(score * 1000000) / 1000000};
    });
  }
  const api = Object.freeze({validateJob, compute});
  scope.X13Compute = api;
  if (typeof module !== "undefined" && module.exports) module.exports = api;
})(typeof self !== "undefined" ? self : globalThis);
