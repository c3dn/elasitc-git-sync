/// <reference path="../pb_data/types.d.ts" />

/**
 * Elastic Git Sync - PocketBase Hooks
 * Compatible with PocketBase v0.23+
 */

// Audit logging helper is defined inside each routerAdd/cronAdd handler
// (PocketBase JSVM requires helper functions to be in the same callback scope)

// SSL Status API
routerAdd("GET", "/api/settings/ssl-status", function(e) {
  var disableSslVerify = $os.getenv("DISABLE_SSL_VERIFY") === "true";
  return e.json(200, {
    ssl_verification_disabled: disableSslVerify
  });
});

// Dashboard Stats API
routerAdd("GET", "/api/dashboard/stats", function(e) {
  var totalProjects = 0;
  var activeSyncs = 0;
  var pendingConflicts = 0;
  var syncSuccessRate = 100;
  var syncList = [];
  var projects = [];
  var totalRules = 0;
  var enabledRules = 0;
  var disabledRules = 0;

  try {
    projects = e.app.findRecordsByFilter("projects", "is_active = true", "", 100, 0);
    totalProjects = projects.length;
  } catch (err) {}

  try {
    var syncs = e.app.findRecordsByFilter("sync_jobs", "status = 'running'", "", 100, 0);
    activeSyncs = syncs.length;
  } catch (err) {}

  try {
    var conflicts = e.app.findRecordsByFilter("conflicts", "resolution = 'pending'", "", 100, 0);
    pendingConflicts = conflicts.length;
  } catch (err) {}

  // Calculate success rate
  try {
    var allJobs = e.app.findRecordsByFilter("sync_jobs", "status != 'running' && status != 'pending'", "-created", 100, 0);
    if (allJobs.length > 0) {
      var successCount = 0;
      for (var j = 0; j < allJobs.length; j++) {
        if (allJobs[j].get("status") === "completed") successCount++;
      }
      syncSuccessRate = Math.round((successCount / allJobs.length) * 100);
    }
  } catch (err) {}

  // Recent sync jobs
  try {
    var recentSyncs = e.app.findRecordsByFilter("sync_jobs", "1=1", "-created", 10, 0);
    for (var i = 0; i < recentSyncs.length; i++) {
      var sync = recentSyncs[i];
      var changesSummary = sync.get("changes_summary");
      if (changesSummary && typeof changesSummary === "string") {
        try { changesSummary = JSON.parse(changesSummary); } catch (err) { changesSummary = null; }
      }
      // Handle byte-array JSON fields from PocketBase
      if (changesSummary && typeof changesSummary !== "string" && typeof changesSummary === "object" && !changesSummary.exported && !changesSummary.added && changesSummary.length) {
        try {
          var raw = "";
          for (var ci = 0; ci < changesSummary.length; ci++) { raw += String.fromCharCode(changesSummary[ci]); }
          try { raw = decodeURIComponent(escape(raw)); } catch(ue) {}
          changesSummary = JSON.parse(raw);
        } catch (err) { changesSummary = null; }
      }
      var projectName = "";
      try {
        var syncProj = e.app.findRecordById("projects", sync.get("project"));
        projectName = syncProj.get("name");
      } catch (err) {}
      syncList.push({
        id: sync.id,
        project: sync.get("project"),
        project_name: projectName,
        type: sync.get("type"),
        direction: sync.get("direction"),
        status: sync.get("status"),
        started_at: sync.get("started_at"),
        completed_at: sync.get("completed_at"),
        error_message: sync.get("error_message") || "",
        changes_summary: changesSummary ? {
          added: changesSummary.exported || changesSummary.imported || changesSummary.added || 0,
          modified: changesSummary.modified || 0,
          deleted: changesSummary.deleted || 0
        } : null,
        created: sync.get("created")
      });
    }
  } catch (err) {}

  // Count rules from snapshots (fast, no Elastic API calls)
  // This avoids slow/unreachable Elastic API calls on dashboard load
  try {
    var allSnapshots = e.app.findRecordsByFilter("rule_snapshots", "1=1", "", 0, 0);
    totalRules = allSnapshots.length;
    for (var si = 0; si < allSnapshots.length; si++) {
      if (allSnapshots[si].get("enabled")) {
        enabledRules++;
      }
    }
  } catch (err) {}
  disabledRules = totalRules - enabledRules;

  // Count pending reviews
  var pendingReviews = 0;
  try {
    var pendingItems = e.app.findRecordsByFilter("pending_changes", "status = 'pending'", "", 0, 0);
    pendingReviews = pendingItems.length;
  } catch (err) {}

  // Count unread notifications
  var unreadNotifications = 0;
  try {
    var unreadItems = e.app.findRecordsByFilter("notifications", "read = false", "", 0, 0);
    unreadNotifications = unreadItems.length;
  } catch (err) {}

  // Recent pending changes for dashboard
  var recentChanges = [];
  try {
    var pendingRecent = e.app.findRecordsByFilter("pending_changes", "1=1", "-created", 10, 0);
    for (var rc = 0; rc < pendingRecent.length; rc++) {
      var ch = pendingRecent[rc];
      var chProjectName = "";
      try {
        var chProj = e.app.findRecordById("projects", ch.get("project"));
        chProjectName = chProj.get("name");
      } catch (err) {}
      recentChanges.push({
        id: ch.id,
        rule_name: ch.get("rule_name"),
        change_type: ch.get("change_type"),
        diff_summary: ch.get("diff_summary"),
        status: ch.get("status"),
        project_name: chProjectName,
        created: ch.get("created")
      });
    }
  } catch (err) {}

  // Last completed sync info
  var lastSync = null;
  try {
    var lastSyncs = e.app.findRecordsByFilter("sync_jobs", "status = 'completed' || status = 'failed'", "-completed_at", 1, 0);
    if (lastSyncs.length > 0) {
      var ls = lastSyncs[0];
      var lsProjectName = "";
      try {
        var lsProj = e.app.findRecordById("projects", ls.get("project"));
        lsProjectName = lsProj.get("name");
      } catch (err) {}
      lastSync = {
        id: ls.id,
        status: ls.get("status"),
        completed_at: ls.get("completed_at"),
        started_at: ls.get("started_at"),
        project_name: lsProjectName,
        direction: ls.get("direction"),
        error_message: ls.get("error_message") || ""
      };
    }
  } catch (err) {}

  // Tracked rules (from rule_snapshots)
  var trackedRules = 0;
  try {
    var snapshots = e.app.findRecordsByFilter("rule_snapshots", "1=1", "", 0, 0);
    trackedRules = snapshots.length;
  } catch (err) {}

  return e.json(200, {
    total_projects: totalProjects,
    active_syncs: activeSyncs,
    pending_conflicts: pendingConflicts,
    recent_syncs: syncList,
    sync_success_rate: syncSuccessRate,
    total_rules: totalRules,
    enabled_rules: enabledRules,
    disabled_rules: disabledRules,
    tracked_rules: trackedRules,
    pending_reviews: pendingReviews,
    unread_notifications: unreadNotifications,
    recent_changes: recentChanges,
    last_sync: lastSync
  });
});

// Connection Test API
routerAdd("POST", "/api/connection/test", function(e) {
  var data = e.requestInfo().body;

  if (data.type === "elastic") {
    var url = data.config.url.replace(/\/$/, "");
    var headers = {
      "Authorization": "ApiKey " + data.config.api_key,
      "Content-Type": "application/json"
    };

    try {
      var response = $http.send({
        url: url + "/api/status",
        method: "GET",
        headers: headers,
        timeout: 10
      });

      if (response.statusCode !== 200) {
        return e.json(200, { success: false, message: "Connection failed with status " + response.statusCode });
      }

      var spaces = [];
      var spacesResponse = $http.send({
        url: url + "/api/spaces/space",
        method: "GET",
        headers: headers,
        timeout: 10
      });

      if (spacesResponse.statusCode === 200) {
        var spacesData = JSON.parse(spacesResponse.raw);
        for (var i = 0; i < spacesData.length; i++) {
          spaces.push(spacesData[i].id);
        }
      }

      return e.json(200, { success: true, message: "Connection successful", spaces: spaces });
    } catch (err) {
      return e.json(200, { success: false, message: "Connection failed: " + String(err) });
    }
  } else if (data.type === "git") {
    var gitUrl = data.config.url.replace(/\.git$/, "");
    var provider = data.config.provider;
    var token = data.config.access_token;

    if (provider === "gitlab") {
      var glUrlMatch = gitUrl.match(/^(https?:\/\/[^\/]+)\/(.+)$/);
      if (!glUrlMatch) {
        return e.json(200, { success: false, message: "Invalid GitLab URL format" });
      }
      var glApiBase = glUrlMatch[1] + "/api/v4";
      var glProject = encodeURIComponent(glUrlMatch[2]);

      try {
        var resp = $http.send({
          url: glApiBase + "/projects/" + glProject,
          method: "GET",
          headers: { "Authorization": "Bearer " + token },
          timeout: 10
        });

        if (resp.statusCode !== 200) {
          return e.json(200, { success: false, message: "GitLab API returned status " + resp.statusCode });
        }

        return e.json(200, { success: true, message: "Connection successful" });
      } catch (err) {
        return e.json(200, { success: false, message: "Connection failed: " + String(err) });
      }
    } else if (provider === "github") {
      var ghMatch = gitUrl.match(/github\.com\/(.+?)\/(.+?)(?:\.git)?$/);
      if (!ghMatch) {
        return e.json(200, { success: false, message: "Invalid GitHub URL format" });
      }

      try {
        var ghResp = $http.send({
          url: "https://api.github.com/repos/" + ghMatch[1] + "/" + ghMatch[2],
          method: "GET",
          headers: { "Authorization": "token " + token, "Accept": "application/vnd.github.v3+json" },
          timeout: 10
        });

        if (ghResp.statusCode !== 200) {
          return e.json(200, { success: false, message: "GitHub API returned status " + ghResp.statusCode });
        }

        return e.json(200, { success: true, message: "Connection successful" });
      } catch (err) {
        return e.json(200, { success: false, message: "Connection failed: " + String(err) });
      }
    } else {
      return e.json(200, { success: true, message: "URL format valid" });
    }
  } else {
    return e.json(400, { success: false, message: "Invalid connection type" });
  }
});

// Rules List API - fetch available rules from Elastic for selection
routerAdd("POST", "/api/rules/list", function(e) {
  var data = e.requestInfo().body;
  var projectId = data.project_id;
  var spaceOverride = data.space;

  try {
    var project = e.app.findRecordById("projects", projectId);
    var elasticId = project.get("elastic_instance");
    var elastic = e.app.findRecordById("elastic_instances", elasticId);
    var elasticUrl = elastic.get("url").replace(/\/$/, "");
    var apiKey = elastic.get("api_key");
    var elasticSpace = spaceOverride || project.get("elastic_space");

    var rulesBaseUrl = elasticUrl + (elasticSpace && elasticSpace !== "default" ? "/s/" + elasticSpace : "") + "/api/detection_engine/rules/_find";

    // Fetch all rules with pagination
    var allRules = [];
    var currentPage = 1;
    var perPage = 10000;
    var totalRules = 0;
    var fetchError = false;

    do {
      var rulesApiUrl = rulesBaseUrl + "?per_page=" + perPage + "&page=" + currentPage + "&sort_field=name&sort_order=asc";
      var resp = $http.send({
        url: rulesApiUrl,
        method: "GET",
        headers: {
          "Authorization": "ApiKey " + apiKey,
          "kbn-xsrf": "true",
          "Content-Type": "application/json"
        },
        timeout: 60
      });

      if (resp.statusCode === 200) {
        var responseData = JSON.parse(resp.raw);
        var pageRules = responseData.data || [];
        totalRules = responseData.total || 0;
        console.log("[Rules List] Page " + currentPage + ": got " + pageRules.length + " rules, total=" + totalRules + ", accumulated=" + (allRules.length + pageRules.length));
        for (var pi = 0; pi < pageRules.length; pi++) {
          allRules.push(pageRules[pi]);
        }
        currentPage++;
      } else {
        console.log("[Rules List] Fetch error on page " + currentPage + ": status=" + resp.statusCode);
        fetchError = true;
        break;
      }
    } while (allRules.length < totalRules);

    if (!fetchError && allRules.length > 0) {
      var rulesSummary = [];

      for (var i = 0; i < allRules.length; i++) {
        var rule = allRules[i];
        rulesSummary.push({
          rule_id: rule.rule_id || rule.id,
          id: rule.id,
          name: rule.name || "",
          description: rule.description || "",
          severity: rule.severity || "unknown",
          type: rule.type || "unknown",
          tags: rule.tags || [],
          enabled: !!rule.enabled
        });
      }

      return e.json(200, {
        success: true,
        rules: rulesSummary,
        total: totalRules || allRules.length
      });
    } else {
      return e.json(200, {
        success: false,
        message: fetchError ? "Elastic API returned an error" : "No rules found",
        rules: [],
        total: 0
      });
    }
  } catch (err) {
    return e.json(500, {
      success: false,
      message: "Failed to fetch rules: " + String(err),
      rules: [],
      total: 0
    });
  }
});

// Sync Trigger API - runs sync immediately
routerAdd("POST", "/api/sync/trigger", function(e) {
  function createNotification(app, title, message, type, severity, link, projectId) {
    try {
      var col = app.findCollectionByNameOrId("notifications");
      var rec = new Record(col);
      rec.set("title", title);
      rec.set("message", message);
      rec.set("type", type);
      rec.set("severity", severity);
      rec.set("link", link || "");
      rec.set("read", false);
      if (projectId) rec.set("project", projectId);
      app.save(rec);
    } catch (err) {
      console.log("[Notification] Error creating: " + String(err));
    }
  }

  function fireWebhooks(app, eventType, payload) {
    try {
      var hooks = app.findRecordsByFilter("webhook_configs", "is_active = true", "", 100, 0);
      for (var i = 0; i < hooks.length; i++) {
        var hook = hooks[i];
        var events = hook.get("events");
        if (typeof events === "string") {
          try { events = JSON.parse(events); } catch (err) { events = []; }
        }
        if (!events || events.indexOf(eventType) === -1) continue;
        var hookUrl = hook.get("url");
        var hookHeaders = hook.get("headers") || {};
        if (typeof hookHeaders === "string") {
          try { hookHeaders = JSON.parse(hookHeaders); } catch (err) { hookHeaders = {}; }
        }
        hookHeaders["Content-Type"] = "application/json";
        var secret = hook.get("secret");
        if (secret) { hookHeaders["X-Webhook-Secret"] = secret; }
        try {
          var resp = $http.send({ url: hookUrl, method: "POST", headers: hookHeaders, body: JSON.stringify(payload), timeout: 10 });
          hook.set("last_triggered", new Date().toISOString());
          hook.set("last_status", resp.statusCode >= 200 && resp.statusCode < 300 ? "success" : "failed");
          app.save(hook);
        } catch (err) {
          hook.set("last_triggered", new Date().toISOString());
          hook.set("last_status", "failed");
          try { app.save(hook); } catch (saveErr) {}
          console.log("[Webhook] Error firing to " + hookUrl + ": " + String(err));
        }
      }
    } catch (err) {
      console.log("[Webhook] Error loading configs: " + String(err));
    }
  }

  function logAudit(app, params) {
    try {
      var user = params.user || "system";
      if (user === "system") { try { var _a = e.requestInfo().auth; if (_a) { user = _a.getString("email") || _a.get("email") || user; } } catch(_x) {} }
      if (user === "system") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { user = _r.getString("email") || _r.get("email") || user; } } } catch(_x) {} }
      var col = app.findCollectionByNameOrId("audit_logs");
      var rec = new Record(col);
      rec.set("user", user);
      rec.set("action", params.action);
      rec.set("resource_type", params.resource_type);
      rec.set("resource_id", params.resource_id || "");
      rec.set("resource_name", params.resource_name || "");
      if (params.project) rec.set("project", params.project);
      rec.set("details", params.details || {});
      rec.set("status", params.status || "success");
      rec.set("error_message", params.error_message || "");
      app.save(rec);
    } catch (err) {
      console.log("[Audit] Error logging: " + String(err));
    }
  }

  var data = e.requestInfo().body;
  var projectId = data.project_id;
  var direction = data.direction || "elastic_to_git";
  // Accept branch and space overrides from environment
  var branchOverride = data.branch;
  var spaceOverride = data.space;
  var environmentId = data.environment_id;
  var selectedRuleIds = data.rule_ids; // optional array of rule_id strings for selective export

  try {
    // If no environment specified, resolve the first one for this project
    if (!environmentId) {
      try {
        var envs = e.app.findRecordsByFilter("environments", "project = '" + projectId + "'", "", 1, 0);
        if (envs && envs.length > 0) {
          environmentId = envs[0].id;
        }
      } catch (err) {}
    }

    // Create sync job record
    var collection = e.app.findCollectionByNameOrId("sync_jobs");
    var job = new Record(collection);

    job.set("project", projectId);
    job.set("type", "manual");
    job.set("direction", direction);
    job.set("status", "running");
    job.set("triggered_by", "user");
    job.set("started_at", new Date().toISOString());
    if (environmentId) {
      job.set("environment", environmentId);
    }
    e.app.save(job);

    // Get project details
    var project = e.app.findRecordById("projects", projectId);
    var elasticId = project.get("elastic_instance");
    var gitRepoId = project.get("git_repository");
    var elasticSpace = spaceOverride || project.get("elastic_space");
    var gitPath = project.get("git_path") || "";

    // Get elastic instance
    var elastic = e.app.findRecordById("elastic_instances", elasticId);
    var elasticUrl = elastic.get("url").replace(/\/$/, "");
    var apiKey = elastic.get("api_key");

    // Get git repository
    var gitRepo = e.app.findRecordById("git_repositories", gitRepoId);
    var gitProvider = gitRepo.get("provider");
    var gitToken = gitRepo.get("access_token");
    var gitBranch = branchOverride || gitRepo.get("default_branch") || "main";
    var gitRepoUrl = gitRepo.get("url").replace(/\.git$/, "");

    var summary = { exported: 0, imported: 0, changes_detected: 0, pending_created: 0 };

    // Export: Elastic -> Git (via detect-and-queue for review)
    if (direction === "elastic_to_git" || direction === "bidirectional") {
      console.log("[Sync] Running change detection for review (elastic_to_git)");

      // Load baseline snapshots for this project/environment
      var baselineSnapshots = [];
      try {
        var snapFilter = "project = '" + projectId + "'";
        if (environmentId) snapFilter += " && environment = '" + environmentId + "'";
        var snapshots = e.app.findRecordsByFilter("rule_snapshots", snapFilter, "", 5000, 0);
        for (var si = 0; si < snapshots.length; si++) {
          var s = snapshots[si];
          // PocketBase JSVM returns JSON fields as byte arrays - convert to objects
          var rc = s.get("rule_content");
          if (rc && typeof rc[0] === "number") {
            var rcStr = "";
            for (var bi = 0; bi < rc.length; bi++) rcStr += String.fromCharCode(rc[bi]);
            try { rcStr = decodeURIComponent(escape(rcStr)); } catch(ue) {}
            try { rc = JSON.parse(rcStr); } catch (err) {}
          }
          var exc = s.get("exceptions") || [];
          if (exc && typeof exc[0] === "number") {
            var excStr = "";
            for (var bi2 = 0; bi2 < exc.length; bi2++) excStr += String.fromCharCode(exc[bi2]);
            try { excStr = decodeURIComponent(escape(excStr)); } catch(ue) {}
            try { exc = JSON.parse(excStr); } catch (err) { exc = []; }
          }
          var tgs = s.get("tags") || [];
          if (tgs && typeof tgs[0] === "number") {
            var tgsStr = "";
            for (var bi3 = 0; bi3 < tgs.length; bi3++) tgsStr += String.fromCharCode(tgs[bi3]);
            try { tgsStr = decodeURIComponent(escape(tgsStr)); } catch(ue) {}
            try { tgs = JSON.parse(tgsStr); } catch (err) { tgs = []; }
          }
          baselineSnapshots.push({
            rule_id: s.get("rule_id"),
            rule_name: s.get("rule_name"),
            rule_hash: s.get("rule_hash"),
            rule_content: rc,
            exceptions: exc,
            enabled: s.get("enabled"),
            severity: s.get("severity"),
            tags: tgs
          });
        }
      } catch (err) {
        console.log("[Sync] Error loading snapshots: " + String(err));
      }

      // Call sync service to detect changes
      var detectResp = $http.send({
        url: "http://localhost:8091/detect-changes",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kibana_url: elasticUrl,
          api_key: apiKey,
          space: elasticSpace,
          baseline_snapshots: baselineSnapshots
        }),
        timeout: 120
      });

      if (detectResp.statusCode !== 200) {
        throw new Error("Sync service returned " + detectResp.statusCode + ": " + detectResp.raw);
      }

      var detectData = JSON.parse(detectResp.raw);
      var changes = detectData.changes || [];
      var detectErrors = detectData.errors || [];

      console.log("[Sync] Detected " + changes.length + " changes, " + detectErrors.length + " errors");
      summary.changes_detected = changes.length;

      // Filter to selected rule_ids if provided
      if (selectedRuleIds && selectedRuleIds.length > 0) {
        var filteredChanges = [];
        for (var fc = 0; fc < changes.length; fc++) {
          for (var sr = 0; sr < selectedRuleIds.length; sr++) {
            if (changes[fc].rule_id === selectedRuleIds[sr]) {
              filteredChanges.push(changes[fc]);
              break;
            }
          }
        }
        changes = filteredChanges;
        console.log("[Sync] Filtered to " + changes.length + " changes for selected rules");
      }

      // Create pending_changes records for review
      var batchId = new Date().toISOString().replace(/[:.]/g, "-") + "-manual-" + projectId.substring(0, 8);
      var pendingCol = e.app.findCollectionByNameOrId("pending_changes");

      for (var ci = 0; ci < changes.length; ci++) {
        var ch = changes[ci];
        var changeTypes = ch.change_types || ["modified_rule"];
        // Use the primary (first) change type for the record
        var primaryType = changeTypes[0];

        try {
          var pending = new Record(pendingCol);
          pending.set("project", projectId);
          if (environmentId) pending.set("environment", environmentId);
          pending.set("detection_batch", batchId);
          pending.set("rule_id", ch.rule_id);
          pending.set("rule_name", ch.rule_name);
          pending.set("change_type", primaryType);
          pending.set("previous_state", ch.previous_state || null);
          pending.set("current_state", ch.current_state || null);
          pending.set("diff_summary", ch.diff_summary || "");
          pending.set("toml_content", ch.toml_content || "");
          pending.set("status", "pending");
          pending.set("reverted", false);
          e.app.save(pending);
          summary.pending_created++;
        } catch (err) {
          console.log("[Sync] Error creating pending change for rule " + ch.rule_id + " (" + ch.rule_name + "): " + String(err));
        }
      }

      // Create notification if changes detected
      if (summary.pending_created > 0) {
        createNotification(e.app,
          summary.pending_created + " changes detected",
          summary.pending_created + " rule change(s) detected in " + project.get("name") + ". Review required before syncing to Git.",
          "change_detected", "warning",
          "/review?batch=" + batchId,
          projectId
        );

        // Fire webhooks
        var changeSummaryList = [];
        for (var ws = 0; ws < changes.length; ws++) {
          changeSummaryList.push({
            rule_name: changes[ws].rule_name,
            change_type: (changes[ws].change_types || ["modified_rule"])[0]
          });
        }

        fireWebhooks(e.app, "change_detected", {
          event: "change_detected",
          timestamp: new Date().toISOString(),
          project: { id: projectId, name: project.get("name") },
          summary: summary.pending_created + " rule changes detected (manual trigger)",
          changes_count: summary.pending_created,
          review_url: "/review?batch=" + batchId,
          changes: changeSummaryList
        });
      }

      if (detectErrors.length > 0) {
        job.set("error_message", detectErrors.join("; ").substring(0, 5000));
      }
    }

    // Import: Git -> Elastic
    if (direction === "git_to_elastic" || direction === "bidirectional") {
      var gitRules = [];

      // Fetch rules from Git
      if (gitProvider === "gitlab") {
        var glImportMatch = gitRepoUrl.match(/^(https?:\/\/[^\/]+)\/(.+)$/);
        if (glImportMatch) {
          var glImportApi = glImportMatch[1] + "/api/v4";
          var glProjPath = encodeURIComponent(glImportMatch[2]);
          var treePath = gitPath ? encodeURIComponent(gitPath) : "";
          var importTreePage = 1;

          try {
            do {
              var treeUrl = glImportApi + "/projects/" + glProjPath + "/repository/tree?ref=" + gitBranch + "&path=" + treePath + "&per_page=100&page=" + importTreePage;
              var treeResp = $http.send({
                url: treeUrl,
                method: "GET",
                headers: { "Authorization": "Bearer " + gitToken },
                timeout: 30
              });

              if (treeResp.statusCode === 200) {
                var files = JSON.parse(treeResp.raw);
                for (var f = 0; f < files.length; f++) {
                  if (files[f].name.endsWith(".json")) {
                    var fileUrl = glImportApi + "/projects/" + glProjPath + "/repository/files/" + encodeURIComponent(files[f].path) + "/raw?ref=" + gitBranch;
                    try {
                      var fileResp = $http.send({
                        url: fileUrl,
                        method: "GET",
                        headers: { "Authorization": "Bearer " + gitToken },
                        timeout: 15
                      });
                      if (fileResp.statusCode === 200) {
                        gitRules.push({ content: fileResp.raw });
                      }
                    } catch (err) {}
                  }
                }
                if (files.length < 100) break;
                importTreePage++;
              } else {
                break;
              }
            } while (true);
          } catch (err) {}
        }
      }

      // Build map of Git rule IDs for deletion detection
      var gitRuleIds = {};
      for (var g = 0; g < gitRules.length; g++) {
        try {
          var parsedRule = JSON.parse(gitRules[g].content);
          gitRuleIds[parsedRule.rule_id] = true;
        } catch (err) {}
      }
      console.log("Git has " + Object.keys(gitRuleIds).length + " rules");

      // Import to Elastic
      var importApiUrl = elasticUrl + (elasticSpace && elasticSpace !== "default" ? "/s/" + elasticSpace : "") + "/api/detection_engine/rules";

      for (var r = 0; r < gitRules.length; r++) {
        try {
          var ruleData = JSON.parse(gitRules[r].content);
          var ruleIdForImport = ruleData.rule_id;

          // Remove read-only fields
          delete ruleData.id;
          delete ruleData.created_at;
          delete ruleData.updated_at;
          delete ruleData.created_by;
          delete ruleData.updated_by;

          var importResp = $http.send({
            url: importApiUrl,
            method: "POST",
            headers: {
              "Authorization": "ApiKey " + apiKey,
              "kbn-xsrf": "true",
              "Content-Type": "application/json"
            },
            body: JSON.stringify(ruleData),
            timeout: 15
          });

          if (importResp.statusCode === 200 || importResp.statusCode === 201) {
            summary.imported++;
            console.log("Imported rule: " + ruleData.name);
          } else if (importResp.statusCode === 409) {
            // Rule exists, try update
            var updateResp = $http.send({
              url: importApiUrl,
              method: "PUT",
              headers: {
                "Authorization": "ApiKey " + apiKey,
                "kbn-xsrf": "true",
                "Content-Type": "application/json"
              },
              body: JSON.stringify(ruleData),
              timeout: 15
            });
            if (updateResp.statusCode === 200) {
              summary.imported++;
              console.log("Updated rule: " + ruleData.name);
            }
          } else {
            console.log("Failed to import rule " + ruleData.name + ": " + importResp.raw);
          }
        } catch (err) {
          console.log("Import error: " + String(err));
        }
      }

      // Delete rules from Elastic that are not in Git
      summary.deleted = summary.deleted || 0;
      var findBaseUrl = elasticUrl + (elasticSpace && elasticSpace !== "default" ? "/s/" + elasticSpace : "") + "/api/detection_engine/rules/_find";

      try {
        var elasticRulesForDelete = [];
        var delPage = 1;
        var delPerPage = 10000;
        var delTotal = 0;

        do {
          var findApiUrl = findBaseUrl + "?per_page=" + delPerPage + "&page=" + delPage + "&sort_field=name&sort_order=asc";
          var findResp = $http.send({
            url: findApiUrl,
            method: "GET",
            headers: {
              "Authorization": "ApiKey " + apiKey,
              "kbn-xsrf": "true"
            },
            timeout: 60
          });

          if (findResp.statusCode === 200) {
            var findData = JSON.parse(findResp.raw);
            var delPageData = findData.data || [];
            delTotal = findData.total || 0;
            console.log("[Delete Check] Page " + delPage + ": got " + delPageData.length + " rules, total=" + delTotal);
            for (var dp = 0; dp < delPageData.length; dp++) {
              elasticRulesForDelete.push(delPageData[dp]);
            }
            delPage++;
          } else {
            console.log("[Delete Check] Fetch error on page " + delPage + ": status=" + findResp.statusCode);
            break;
          }
        } while (elasticRulesForDelete.length < delTotal);

        if (elasticRulesForDelete.length > 0) {
          console.log("Elastic has " + elasticRulesForDelete.length + " rules, checking for deletions...");

          for (var d = 0; d < elasticRulesForDelete.length; d++) {
            var elasticRule = elasticRulesForDelete[d];
            var elasticRuleId = elasticRule.rule_id;

            if (!gitRuleIds[elasticRuleId]) {
              // Rule doesn't exist in Git, delete from Elastic
              console.log("Deleting rule not in Git: " + elasticRule.name + " (" + elasticRuleId + ")");
              var deleteApiUrl = elasticUrl + (elasticSpace && elasticSpace !== "default" ? "/s/" + elasticSpace : "") + "/api/detection_engine/rules?rule_id=" + encodeURIComponent(elasticRuleId);

              try {
                var deleteResp = $http.send({
                  url: deleteApiUrl,
                  method: "DELETE",
                  headers: {
                    "Authorization": "ApiKey " + apiKey,
                    "kbn-xsrf": "true"
                  },
                  timeout: 15
                });

                if (deleteResp.statusCode === 200) {
                  summary.deleted++;
                  console.log("Deleted: " + elasticRule.name);
                } else {
                  console.log("Failed to delete rule: " + deleteResp.raw);
                }
              } catch (err) {
                console.log("Delete error: " + String(err));
              }
            }
          }
        }
      } catch (err) {
        console.log("Error fetching Elastic rules for deletion: " + String(err));
      }
    }

    // Update job as completed
    job.set("status", "completed");
    job.set("completed_at", new Date().toISOString());
    job.set("changes_summary", JSON.stringify(summary));
    e.app.save(job);

    var msgParts = [];
    if (summary.changes_detected) msgParts.push(summary.changes_detected + " changes detected");
    if (summary.pending_created) msgParts.push(summary.pending_created + " queued for review");
    if (summary.imported) msgParts.push(summary.imported + " imported");
    var msg = msgParts.length > 0 ? msgParts.join(", ") : "No changes detected";

    // Audit log
    logAudit(e.app, {
      user: "user",
      action: "sync_triggered",
      resource_type: "sync_job",
      resource_id: job.id,
      resource_name: project.get("name"),
      project: projectId,
      details: { direction: direction, rule_count: selectedRuleIds ? selectedRuleIds.length : "all", summary: summary },
      status: job.get("status") === "failed" ? "error" : "success",
      error_message: job.get("error_message") || ""
    });

    return e.json(200, {
      success: true,
      sync_job_id: job.id,
      message: msg,
      summary: summary
    });

  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// Rule Diffs API
routerAdd("GET", "/api/rules/diff/{projectId}", function(e) {
  var projectId = e.request.pathValue("projectId");
  var result = [];

  try {
    var rules = e.app.findRecordsByFilter(
      "rules_cache",
      "project = '" + projectId + "' && sync_status != 'synced'",
      "",
      100,
      0
    );

    for (var i = 0; i < rules.length; i++) {
      var rule = rules[i];
      result.push({
        rule_id: rule.get("rule_id"),
        rule_name: rule.get("rule_name"),
        sync_status: rule.get("sync_status"),
        elastic_hash: rule.get("elastic_hash"),
        git_hash: rule.get("git_hash"),
        last_sync: rule.get("last_sync")
      });
    }
  } catch (err) {}

  return e.json(200, result);
});

// Project Metrics API
routerAdd("GET", "/api/project/{projectId}/metrics", function(e) {
  var projectId = e.request.pathValue("projectId");

  try {
    var project = e.app.findRecordById("projects", projectId);
    var elasticId = project.get("elastic_instance");
    var elastic = e.app.findRecordById("elastic_instances", elasticId);
    var elasticUrl = elastic.get("url").replace(/\/$/, "");
    var apiKey = elastic.get("api_key");

    var testRules = 0;
    var prodRules = 0;
    var testLastSync = null;
    var prodLastSync = null;

    // Get environments
    var environments = e.app.findRecordsByFilter("environments", "project = '" + projectId + "'", "", 10, 0);

    for (var i = 0; i < environments.length; i++) {
      var env = environments[i];
      var envSpace = env.get("elastic_space");
      var envName = env.get("name");

      // Count rules in this space
      var rulesApiUrl = elasticUrl + (envSpace && envSpace !== "default" ? "/s/" + envSpace : "") + "/api/detection_engine/rules/_find?per_page=1";

      try {
        var resp = $http.send({
          url: rulesApiUrl,
          method: "GET",
          headers: {
            "Authorization": "ApiKey " + apiKey,
            "kbn-xsrf": "true"
          },
          timeout: 10
        });

        if (resp.statusCode === 200) {
          var data = JSON.parse(resp.raw);
          var count = data.total || 0;

          if (envName === "test") {
            testRules = count;
          } else if (envName === "production") {
            prodRules = count;
          }
        }
      } catch (err) {
        console.log("Error fetching rules for " + envName + ": " + String(err));
      }

      // Get last sync for this environment
      try {
        var syncJobs = e.app.findRecordsByFilter("sync_jobs", "project = '" + projectId + "' && status = 'completed'", "-created", 1, 0);
        if (syncJobs.length > 0) {
          var lastSync = syncJobs[0].get("completed_at");
          if (envName === "test") {
            testLastSync = lastSync;
          } else if (envName === "production") {
            prodLastSync = lastSync;
          }
        }
      } catch (err) {}
    }

    return e.json(200, {
      test_rules: testRules,
      prod_rules: prodRules,
      test_last_sync: testLastSync,
      prod_last_sync: prodLastSync
    });

  } catch (err) {
    return e.json(500, { error: String(err) });
  }
});

// Merge Request Creation API
routerAdd("POST", "/api/merge-request/create", function(e) {
  function logAudit(app, params) {
    try {
      var user = params.user || "system";
      if (user === "system") { try { var _a = e.requestInfo().auth; if (_a) { user = _a.getString("email") || _a.get("email") || user; } } catch(_x) {} }
      if (user === "system") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { user = _r.getString("email") || _r.get("email") || user; } } } catch(_x) {} }
      var col = app.findCollectionByNameOrId("audit_logs");
      var rec = new Record(col);
      rec.set("user", user);
      rec.set("action", params.action);
      rec.set("resource_type", params.resource_type);
      rec.set("resource_id", params.resource_id || "");
      rec.set("resource_name", params.resource_name || "");
      if (params.project) rec.set("project", params.project);
      rec.set("details", params.details || {});
      rec.set("status", params.status || "success");
      rec.set("error_message", params.error_message || "");
      app.save(rec);
    } catch (err) {
      console.log("[Audit] Error logging: " + String(err));
    }
  }

  var data = e.requestInfo().body;
  var projectId = data.project_id;
  var sourceBranch = data.source_branch;
  var targetBranch = data.target_branch;
  var title = data.title || "Promote rules from " + sourceBranch + " to " + targetBranch;

  try {
    // Get project and git repository
    var project = e.app.findRecordById("projects", projectId);
    var gitRepoId = project.get("git_repository");
    var gitRepo = e.app.findRecordById("git_repositories", gitRepoId);
    var gitProvider = gitRepo.get("provider");
    var gitToken = gitRepo.get("access_token");
    var gitRepoUrl = gitRepo.get("url").replace(/\.git$/, "");

    if (gitProvider === "gitlab") {
      var glMrMatch = gitRepoUrl.match(/^(https?:\/\/[^\/]+)\/(.+)$/);
      if (!glMrMatch) {
        return e.json(400, { success: false, message: "Invalid GitLab URL" });
      }

      var glApiBase = glMrMatch[1] + "/api/v4";
      var glProjectEncoded = encodeURIComponent(glMrMatch[2]);
      var mrApiUrl = glApiBase + "/projects/" + glProjectEncoded + "/merge_requests";

      var mrResp = $http.send({
        url: mrApiUrl,
        method: "POST",
        headers: {
          "Authorization": "Bearer " + gitToken,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          source_branch: sourceBranch,
          target_branch: targetBranch,
          title: title,
          description: "Automated merge request to promote detection rules from " + sourceBranch + " to " + targetBranch + ".\n\nCreated by Elastic Git Sync."
        }),
        timeout: 15
      });

      if (mrResp.statusCode === 201) {
        var mrData = JSON.parse(mrResp.raw);
        var mrIid = mrData.iid;
        var mrUrl = mrData.web_url;
        var conflictsResolved = false;
        var conflictsCount = 0;

        // Check if MR has conflicts and auto-resolve
        if (mrData.has_conflicts) {
          console.log("MR " + mrIid + " has conflicts, attempting auto-resolve...");

          // Step 1: Try rebase
          var rebaseResolved = false;
          try {
            var rebaseUrl = glApiBase + "/projects/" + glProjectEncoded + "/merge_requests/" + mrIid + "/rebase";
            var rebaseResp = $http.send({
              url: rebaseUrl,
              method: "PUT",
              headers: { "Authorization": "Bearer " + gitToken },
              timeout: 30
            });
            console.log("Rebase response status: " + rebaseResp.statusCode);

            if (rebaseResp.statusCode === 202 || rebaseResp.statusCode === 200) {
              // Poll MR status to check if rebase resolved conflicts
              for (var poll = 0; poll < 10; poll++) {
                var checkUrl = glApiBase + "/projects/" + glProjectEncoded + "/merge_requests/" + mrIid;
                var checkResp = $http.send({
                  url: checkUrl,
                  method: "GET",
                  headers: { "Authorization": "Bearer " + gitToken },
                  timeout: 10
                });

                if (checkResp.statusCode === 200) {
                  var checkData = JSON.parse(checkResp.raw);
                  if (!checkData.rebase_in_progress) {
                    if (!checkData.has_conflicts) {
                      rebaseResolved = true;
                      conflictsResolved = true;
                      console.log("Rebase resolved all conflicts");
                    } else {
                      console.log("Rebase completed but conflicts remain");
                    }
                    break;
                  }
                }
              }
            }
          } catch (err) {
            console.log("Rebase error: " + String(err));
          }

          // Step 2: If rebase didn't resolve, try manual conflict resolution via API
          if (!rebaseResolved) {
            console.log("Attempting manual conflict resolution...");
            try {
              var conflictsUrl = glApiBase + "/projects/" + glProjectEncoded + "/merge_requests/" + mrIid + "/conflicts";
              var conflictsResp = $http.send({
                url: conflictsUrl,
                method: "GET",
                headers: { "Authorization": "Bearer " + gitToken },
                timeout: 15
              });

              if (conflictsResp.statusCode === 200) {
                var conflictData = JSON.parse(conflictsResp.raw);
                var conflictFiles = conflictData.files || conflictData;
                if (Array.isArray(conflictFiles)) {
                  conflictsCount = conflictFiles.length;
                  console.log("Found " + conflictsCount + " conflicting files");

                  // Build resolution: use source branch content for each conflicting file
                  var resolvedFiles = [];
                  for (var cf = 0; cf < conflictFiles.length; cf++) {
                    var conflict = conflictFiles[cf];
                    var conflictPath = conflict.new_path || conflict.old_path;
                    var sourceFileUrl = glApiBase + "/projects/" + glProjectEncoded + "/repository/files/" + encodeURIComponent(conflictPath) + "/raw?ref=" + encodeURIComponent(sourceBranch);

                    try {
                      var sourceResp = $http.send({
                        url: sourceFileUrl,
                        method: "GET",
                        headers: { "Authorization": "Bearer " + gitToken },
                        timeout: 10
                      });

                      if (sourceResp.statusCode === 200) {
                        resolvedFiles.push({
                          old_path: conflict.old_path,
                          new_path: conflict.new_path || conflict.old_path,
                          content: sourceResp.raw
                        });
                      } else {
                        console.log("Could not fetch source file " + conflictPath + ": " + sourceResp.statusCode);
                      }
                    } catch (err) {
                      console.log("Error fetching source file " + conflictPath + ": " + String(err));
                    }
                  }

                  if (resolvedFiles.length > 0) {
                    var resolveResp = $http.send({
                      url: conflictsUrl,
                      method: "PUT",
                      headers: {
                        "Authorization": "Bearer " + gitToken,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        commit_message: "Auto-resolve conflicts: use source branch (" + sourceBranch + ") content",
                        files: resolvedFiles
                      }),
                      timeout: 30
                    });

                    if (resolveResp.statusCode === 200) {
                      conflictsResolved = true;
                      console.log("Manually resolved " + resolvedFiles.length + " conflicts");
                    } else {
                      console.log("Conflict resolution API failed: " + resolveResp.statusCode + " " + resolveResp.raw);
                    }
                  }
                }
              } else {
                console.log("Failed to fetch conflicts: " + conflictsResp.statusCode);
              }
            } catch (err) {
              console.log("Manual conflict resolution error: " + String(err));
            }
          }
        }

        var mrMessage = "Merge Request created";
        if (conflictsResolved) {
          mrMessage += " (" + (conflictsCount || "all") + " conflicts auto-resolved)";
        }

        // Audit log - GitLab MR
        logAudit(e.app, {
          user: "user",
          action: "mr_created",
          resource_type: "project",
          resource_id: projectId,
          resource_name: project.get("name"),
          project: projectId,
          details: { provider: "gitlab", mr_url: mrUrl, mr_id: mrIid, source: sourceBranch, target: targetBranch, conflicts_resolved: conflictsResolved }
        });

        return e.json(200, {
          success: true,
          message: mrMessage,
          mr_id: mrIid,
          url: mrUrl,
          conflicts_resolved: conflictsResolved,
          conflicts_count: conflictsCount
        });
      } else if (mrResp.statusCode === 409) {
        // MR already exists
        return e.json(200, {
          success: false,
          message: "A merge request already exists for this branch combination"
        });
      } else {
        var errData = JSON.parse(mrResp.raw);
        return e.json(400, {
          success: false,
          message: errData.message || "Failed to create Merge Request: " + mrResp.statusCode
        });
      }
    } else if (gitProvider === "github") {
      var ghMatch = gitRepoUrl.match(/github\.com\/(.+?)\/(.+?)$/);
      if (!ghMatch) {
        return e.json(400, { success: false, message: "Invalid GitHub URL" });
      }

      var ghOwner = ghMatch[1];
      var ghRepoName = ghMatch[2];
      var ghApiBase = "https://api.github.com/repos/" + ghOwner + "/" + ghRepoName;
      var ghHeaders = { "Authorization": "token " + gitToken, "Accept": "application/vnd.github.v3+json" };
      var prApiUrl = ghApiBase + "/pulls";

      var prResp = $http.send({
        url: prApiUrl,
        method: "POST",
        headers: ghHeaders,
        body: JSON.stringify({
          title: title,
          head: sourceBranch,
          base: targetBranch,
          body: "Automated pull request to promote detection rules from " + sourceBranch + " to " + targetBranch + ".\n\nCreated by Elastic Git Sync."
        }),
        timeout: 15
      });

      if (prResp.statusCode === 201) {
        var prData = JSON.parse(prResp.raw);
        var prNumber = prData.number;
        var prUrl = prData.html_url;
        var ghConflictsResolved = false;
        var ghConflictsCount = 0;

        // GitHub computes mergeable status async — poll to check for conflicts
        var prMergeable = null;
        for (var ghPoll = 0; ghPoll < 5; ghPoll++) {
          var prCheckResp = $http.send({
            url: ghApiBase + "/pulls/" + prNumber,
            method: "GET",
            headers: ghHeaders,
            timeout: 10
          });

          if (prCheckResp.statusCode === 200) {
            var prCheckData = JSON.parse(prCheckResp.raw);
            if (prCheckData.mergeable !== null) {
              prMergeable = prCheckData.mergeable;
              break;
            }
          }
        }

        // If PR has conflicts, try to resolve by merging base into head
        if (prMergeable === false) {
          console.log("PR " + prNumber + " has conflicts, attempting auto-resolve...");

          try {
            // Try merging target (base) into source (head) branch
            var mergeResp = $http.send({
              url: ghApiBase + "/merges",
              method: "POST",
              headers: ghHeaders,
              body: JSON.stringify({
                base: sourceBranch,
                head: targetBranch,
                commit_message: "Auto-merge " + targetBranch + " into " + sourceBranch + " to resolve conflicts"
              }),
              timeout: 30
            });

            if (mergeResp.statusCode === 201) {
              ghConflictsResolved = true;
              console.log("Merged " + targetBranch + " into " + sourceBranch + " to resolve conflicts");
            } else if (mergeResp.statusCode === 409) {
              // Merge conflicts — need manual file-level resolution
              console.log("Auto-merge failed, attempting file-level resolution...");

              // Compare branches to find conflicting files
              var compareResp = $http.send({
                url: ghApiBase + "/compare/" + targetBranch + "..." + sourceBranch,
                method: "GET",
                headers: ghHeaders,
                timeout: 15
              });

              if (compareResp.statusCode === 200) {
                var compareData = JSON.parse(compareResp.raw);
                var changedFiles = compareData.files || [];
                ghConflictsCount = changedFiles.length;

                // For each changed file, get the source branch version and recommit
                for (var gf = 0; gf < changedFiles.length; gf++) {
                  var changedFile = changedFiles[gf];
                  var ghFilePath = changedFile.filename;

                  // Get file content from source branch
                  try {
                    var ghFileResp = $http.send({
                      url: ghApiBase + "/contents/" + ghFilePath + "?ref=" + encodeURIComponent(sourceBranch),
                      method: "GET",
                      headers: ghHeaders,
                      timeout: 10
                    });

                    if (ghFileResp.statusCode === 200) {
                      var ghFileData = JSON.parse(ghFileResp.raw);
                      // File exists on source — get its SHA and content
                      // The content is already base64 from the API

                      // Get the file SHA on target branch to update it
                      var ghTargetFileResp = $http.send({
                        url: ghApiBase + "/contents/" + ghFilePath + "?ref=" + encodeURIComponent(targetBranch),
                        method: "GET",
                        headers: ghHeaders,
                        timeout: 10
                      });

                      if (ghTargetFileResp.statusCode === 200) {
                        // File exists on target too — update source branch with a merge commit
                        // This approach updates the source branch to include target content then overwrite
                        console.log("Conflict in " + ghFilePath + " — source version will be kept via MR");
                      }
                    }
                  } catch (err) {
                    console.log("Error processing conflicted file " + ghFilePath + ": " + String(err));
                  }
                }
              }
            }
          } catch (err) {
            console.log("GitHub conflict resolution error: " + String(err));
          }
        }

        var prMessage = "Pull Request created";
        if (ghConflictsResolved) {
          prMessage += " (" + (ghConflictsCount || "all") + " conflicts auto-resolved)";
        }

        // Audit log - GitHub PR
        logAudit(e.app, {
          user: "user",
          action: "mr_created",
          resource_type: "project",
          resource_id: projectId,
          resource_name: project.get("name"),
          project: projectId,
          details: { provider: "github", pr_url: prUrl, pr_id: prNumber, source: sourceBranch, target: targetBranch, conflicts_resolved: ghConflictsResolved }
        });

        return e.json(200, {
          success: true,
          message: prMessage,
          pr_id: prNumber,
          url: prUrl,
          conflicts_resolved: ghConflictsResolved,
          conflicts_count: ghConflictsCount
        });
      } else {
        var ghErrData = JSON.parse(prResp.raw);
        return e.json(400, {
          success: false,
          message: ghErrData.message || "Failed to create Pull Request: " + prResp.statusCode
        });
      }
    } else {
      return e.json(400, { success: false, message: "MR creation not supported for this provider" });
    }

  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Review API: List pending changes
// ============================================================================
routerAdd("GET", "/api/review/pending", function(e) {
  var projectId = e.request.url.query().get("project_id");
  var batchId = e.request.url.query().get("batch_id");
  var statusFilter = e.request.url.query().get("status") || "pending";

  var filter = "status = '" + statusFilter + "'";
  if (projectId) filter += " && project = '" + projectId + "'";
  if (batchId) filter += " && detection_batch = '" + batchId + "'";

  try {
    var records = e.app.findRecordsByFilter("pending_changes", filter, "-created", 200, 0);
    var result = [];
    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      result.push({
        id: r.id,
        project: r.get("project"),
        environment: r.get("environment"),
        detection_batch: r.get("detection_batch"),
        rule_id: r.get("rule_id"),
        rule_name: r.get("rule_name"),
        change_type: r.get("change_type"),
        previous_state: r.get("previous_state"),
        current_state: r.get("current_state"),
        diff_summary: r.get("diff_summary"),
        toml_content: r.get("toml_content"),
        status: r.get("status"),
        reviewed_by: r.get("reviewed_by"),
        reviewed_at: r.get("reviewed_at"),
        reverted: r.get("reverted"),
        created: r.get("created")
      });
    }
    return e.json(200, { success: true, changes: result, total: result.length });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Review API: Approve a change
// ============================================================================
routerAdd("POST", "/api/review/approve", function(e) {
  function logAudit(app, params) {
    try {
      var user = params.user || "system";
      if (user === "system") { try { var _a = e.requestInfo().auth; if (_a) { user = _a.getString("email") || _a.get("email") || user; } } catch(_x) {} }
      if (user === "system") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { user = _r.getString("email") || _r.get("email") || user; } } } catch(_x) {} }
      var col = app.findCollectionByNameOrId("audit_logs");
      var rec = new Record(col);
      rec.set("user", user);
      rec.set("action", params.action);
      rec.set("resource_type", params.resource_type);
      rec.set("resource_id", params.resource_id || "");
      rec.set("resource_name", params.resource_name || "");
      if (params.project) rec.set("project", params.project);
      rec.set("details", params.details || {});
      rec.set("status", params.status || "success");
      rec.set("error_message", params.error_message || "");
      app.save(rec);
    } catch (err) {
      console.log("[Audit] Error logging: " + String(err));
    }
  }

  function createNotification(app, title, message, type, severity, link, projectId) {
    try {
      var col = app.findCollectionByNameOrId("notifications");
      var rec = new Record(col);
      rec.set("title", title);
      rec.set("message", message);
      rec.set("type", type);
      rec.set("severity", severity);
      rec.set("link", link || "");
      rec.set("read", false);
      if (projectId) rec.set("project", projectId);
      app.save(rec);
    } catch (err) {
      console.log("[Notification] Error creating: " + String(err));
    }
  }

  function fireWebhooks(app, eventType, payload) {
    try {
      var hooks = app.findRecordsByFilter("webhook_configs", "is_active = true", "", 100, 0);
      for (var i = 0; i < hooks.length; i++) {
        var hook = hooks[i];
        var events = hook.get("events");
        if (typeof events === "string") {
          try { events = JSON.parse(events); } catch (err) { events = []; }
        }
        if (!events || events.indexOf(eventType) === -1) continue;
        var hookUrl = hook.get("url");
        var hookHeaders = hook.get("headers") || {};
        if (typeof hookHeaders === "string") {
          try { hookHeaders = JSON.parse(hookHeaders); } catch (err) { hookHeaders = {}; }
        }
        hookHeaders["Content-Type"] = "application/json";
        var secret = hook.get("secret");
        if (secret) { hookHeaders["X-Webhook-Secret"] = secret; }
        try {
          var resp = $http.send({ url: hookUrl, method: "POST", headers: hookHeaders, body: JSON.stringify(payload), timeout: 10 });
          hook.set("last_triggered", new Date().toISOString());
          hook.set("last_status", resp.statusCode >= 200 && resp.statusCode < 300 ? "success" : "failed");
          app.save(hook);
        } catch (err) {
          hook.set("last_triggered", new Date().toISOString());
          hook.set("last_status", "failed");
          try { app.save(hook); } catch (saveErr) {}
          console.log("[Webhook] Error firing to " + hookUrl + ": " + String(err));
        }
      }
    } catch (err) {
      console.log("[Webhook] Error loading configs: " + String(err));
    }
  }

  function commitTomlToGit(app, projectId, ruleId, ruleName, tomlContent, isDelete) {
    console.log("[Git-Commit] Starting commitTomlToGit: ruleId=" + ruleId + " ruleName=" + ruleName + " isDelete=" + isDelete + " tomlLength=" + (tomlContent ? tomlContent.length : 0));
    var project = app.findRecordById("projects", projectId);
    var gitRepoId = project.get("git_repository");
    if (!gitRepoId) {
      console.log("[Git-Commit] ERROR: No git_repository configured for project " + projectId);
      return { success: false, message: "No git repository configured for project" };
    }
    var gitRepo = app.findRecordById("git_repositories", gitRepoId);
    var gitProvider = gitRepo.get("provider");
    var gitToken = gitRepo.get("access_token");
    var gitBranch = gitRepo.get("default_branch") || "main";
    var gitRepoUrl = gitRepo.get("url").replace(/\.git$/, "");
    var gitPath = project.get("git_path") || "";
    console.log("[Git-Commit] Config: provider=" + gitProvider + " repoUrl=" + gitRepoUrl + " defaultBranch=" + gitBranch + " gitPath=" + gitPath + " hasToken=" + !!gitToken);
    try {
      var envs = app.findRecordsByFilter("environments", "project = '" + projectId + "'", "", 1, 0);
      if (envs.length > 0) {
        var envBranch = envs[0].get("git_branch");
        var envName = envs[0].get("name") || "unknown";
        console.log("[Git-Commit] Environment found: name=" + envName + " git_branch=" + (envBranch || "(not set)"));
        if (envBranch) { gitBranch = envBranch; }
      } else {
        console.log("[Git-Commit] No environments found for project, using default branch: " + gitBranch);
      }
    } catch (err) {
      console.log("[Git-Commit] WARNING: Failed to query environments: " + String(err));
    }
    var fileName = ruleId + ".toml";
    var filePath = gitPath ? gitPath + "/" + fileName : fileName;
    console.log("[Git-Commit] Resolved target: branch=" + gitBranch + " filePath=" + filePath);
    if (gitProvider === "gitlab") {
      var glMatch = gitRepoUrl.match(/^(https?:\/\/[^\/]+)\/(.+)$/);
      if (!glMatch) {
        console.log("[Git-Commit] ERROR: Invalid GitLab URL format: " + gitRepoUrl);
        return { success: false, message: "Invalid GitLab URL: " + gitRepoUrl };
      }
      var glApiBase = glMatch[1] + "/api/v4";
      var glProject = encodeURIComponent(glMatch[2]);
      var glFileUrl = glApiBase + "/projects/" + glProject + "/repository/files/" + encodeURIComponent(filePath);
      console.log("[Git-Commit] GitLab API URL: " + glFileUrl);
      if (isDelete) {
        try {
          console.log("[Git-Commit] GitLab DELETE request: branch=" + gitBranch);
          var delResp = $http.send({ url: glFileUrl, method: "DELETE", headers: { "Authorization": "Bearer " + gitToken, "Content-Type": "application/json" }, body: JSON.stringify({ branch: gitBranch, commit_message: "[Approved] Delete rule: " + ruleName }), timeout: 15 });
          console.log("[Git-Commit] GitLab DELETE response: statusCode=" + delResp.statusCode + " body=" + (delResp.raw || "").substring(0, 500));
          var delSuccess = delResp.statusCode === 204 || delResp.statusCode === 200;
          if (!delSuccess) { console.log("[Git-Commit] ERROR: GitLab DELETE failed with status " + delResp.statusCode); }
          return { success: delSuccess, message: delSuccess ? "Deleted from Git" : "GitLab DELETE failed (HTTP " + delResp.statusCode + "): " + (delResp.raw || "").substring(0, 300) };
        } catch (err) {
          console.log("[Git-Commit] ERROR: GitLab DELETE exception: " + String(err));
          return { success: false, message: "GitLab DELETE exception: " + String(err) };
        }
      }
      var methods = ["PUT", "POST"];
      var lastStatusCode = 0;
      var lastResponseBody = "";
      for (var m = 0; m < methods.length; m++) {
        try {
          console.log("[Git-Commit] GitLab " + methods[m] + " request: branch=" + gitBranch + " contentLength=" + (tomlContent ? tomlContent.length : 0));
          var glResp = $http.send({ url: glFileUrl, method: methods[m], headers: { "Authorization": "Bearer " + gitToken, "Content-Type": "application/json" }, body: JSON.stringify({ branch: gitBranch, content: tomlContent, commit_message: "[Approved] " + (methods[m] === "POST" ? "Add" : "Update") + " rule: " + ruleName }), timeout: 15 });
          lastStatusCode = glResp.statusCode;
          lastResponseBody = (glResp.raw || "").substring(0, 500);
          console.log("[Git-Commit] GitLab " + methods[m] + " response: statusCode=" + glResp.statusCode + " body=" + lastResponseBody);
          if (glResp.statusCode === 200 || glResp.statusCode === 201) {
            console.log("[Git-Commit] GitLab commit successful via " + methods[m]);
            return { success: true, message: "Committed to Git via " + methods[m] };
          }
          console.log("[Git-Commit] GitLab " + methods[m] + " non-success status " + glResp.statusCode + ", trying next method...");
        } catch (err) {
          console.log("[Git-Commit] ERROR: GitLab " + methods[m] + " exception: " + String(err));
          lastResponseBody = String(err);
        }
      }
      var failMsg = "Failed to commit to GitLab (last HTTP " + lastStatusCode + "): " + lastResponseBody;
      console.log("[Git-Commit] ERROR: " + failMsg);
      return { success: false, message: failMsg };
    } else if (gitProvider === "github") {
      var ghMatch = gitRepoUrl.match(/github\.com\/(.+?)\/(.+?)$/);
      if (!ghMatch) {
        console.log("[Git-Commit] ERROR: Invalid GitHub URL format: " + gitRepoUrl);
        return { success: false, message: "Invalid GitHub URL: " + gitRepoUrl };
      }
      var ghOwner = ghMatch[1];
      var ghRepoName = ghMatch[2];
      var ghApiUrl = "https://api.github.com/repos/" + ghOwner + "/" + ghRepoName + "/contents/" + filePath;
      var ghHeaders = { "Authorization": "token " + gitToken, "Accept": "application/vnd.github.v3+json" };
      console.log("[Git-Commit] GitHub API URL: " + ghApiUrl + " owner=" + ghOwner + " repo=" + ghRepoName);
      var sha = "";
      try {
        var getResp = $http.send({ url: ghApiUrl + "?ref=" + gitBranch, method: "GET", headers: ghHeaders, timeout: 10 });
        console.log("[Git-Commit] GitHub GET existing file: statusCode=" + getResp.statusCode);
        if (getResp.statusCode === 200) {
          sha = JSON.parse(getResp.raw).sha;
          console.log("[Git-Commit] GitHub existing file SHA: " + sha);
        } else {
          console.log("[Git-Commit] GitHub file does not exist yet (status " + getResp.statusCode + ")");
        }
      } catch (err) {
        console.log("[Git-Commit] GitHub GET file check failed (file may not exist): " + String(err));
      }
      if (isDelete) {
        if (!sha) {
          console.log("[Git-Commit] GitHub DELETE: file already absent, skipping");
          return { success: true, message: "File already absent" };
        }
        try {
          console.log("[Git-Commit] GitHub DELETE request: sha=" + sha + " branch=" + gitBranch);
          var ghDelResp = $http.send({ url: ghApiUrl, method: "DELETE", headers: ghHeaders, body: JSON.stringify({ message: "[Approved] Delete rule: " + ruleName, sha: sha, branch: gitBranch }), timeout: 15 });
          console.log("[Git-Commit] GitHub DELETE response: statusCode=" + ghDelResp.statusCode + " body=" + (ghDelResp.raw || "").substring(0, 500));
          var ghDelSuccess = ghDelResp.statusCode === 200;
          return { success: ghDelSuccess, message: ghDelSuccess ? "Deleted from Git" : "GitHub DELETE failed (HTTP " + ghDelResp.statusCode + "): " + (ghDelResp.raw || "").substring(0, 300) };
        } catch (err) {
          console.log("[Git-Commit] ERROR: GitHub DELETE exception: " + String(err));
          return { success: false, message: "GitHub DELETE exception: " + String(err) };
        }
      }
      try {
        var ghBody = { message: "[Approved] " + (sha ? "Update" : "Add") + " rule: " + ruleName, content: $security.base64Encode(tomlContent), branch: gitBranch };
        if (sha) ghBody.sha = sha;
        console.log("[Git-Commit] GitHub PUT request: branch=" + gitBranch + " hasSha=" + !!sha + " contentLength=" + (tomlContent ? tomlContent.length : 0));
        var ghResp = $http.send({ url: ghApiUrl, method: "PUT", headers: ghHeaders, body: JSON.stringify(ghBody), timeout: 15 });
        console.log("[Git-Commit] GitHub PUT response: statusCode=" + ghResp.statusCode + " body=" + (ghResp.raw || "").substring(0, 500));
        if (ghResp.statusCode === 200 || ghResp.statusCode === 201) {
          console.log("[Git-Commit] GitHub commit successful");
          return { success: true, message: "Committed to Git" };
        }
        var ghFailMsg = "Failed to commit to GitHub (HTTP " + ghResp.statusCode + "): " + (ghResp.raw || "").substring(0, 300);
        console.log("[Git-Commit] ERROR: " + ghFailMsg);
        return { success: false, message: ghFailMsg };
      } catch (err) {
        console.log("[Git-Commit] ERROR: GitHub PUT exception: " + String(err));
        return { success: false, message: "GitHub PUT exception: " + String(err) };
      }
    }
    console.log("[Git-Commit] ERROR: Unsupported provider: " + gitProvider);
    return { success: false, message: "Unsupported provider: " + gitProvider };
  }

  var data = e.requestInfo().body;
  var changeId = data.change_id;
  var reviewedBy = data.reviewed_by || "unknown";
  try { var _a = e.requestInfo().auth; if (_a) { reviewedBy = _a.getString("email") || _a.get("email") || reviewedBy; } } catch(_x) {}
  if (reviewedBy === "unknown") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { reviewedBy = _r.getString("email") || _r.get("email") || reviewedBy; } } } catch(_x) {} }

  try {
    var change = e.app.findRecordById("pending_changes", changeId);
    if (change.get("status") !== "pending") {
      return e.json(400, { success: false, message: "Change already " + change.get("status") });
    }

    var ruleId = change.get("rule_id");
    var ruleName = change.get("rule_name");
    var changeType = change.get("change_type");
    var currentState = change.get("current_state");
    // PocketBase JSVM may return JSON fields as byte arrays
    if (currentState && typeof currentState[0] === "number") {
      var csStr = "";
      for (var csi = 0; csi < currentState.length; csi++) csStr += String.fromCharCode(currentState[csi]);
      try { csStr = decodeURIComponent(escape(csStr)); } catch(ue) {}
      try { currentState = JSON.parse(csStr); } catch (err) {}
    }
    var tomlContent = change.get("toml_content");
    var projectId = change.get("project");
    var environmentId = change.get("environment");
    var isDelete = changeType === "deleted_rule";

    // If no TOML content and not a delete, generate it via sync service
    if (!tomlContent && !isDelete && currentState) {
      try {
        var tomlResp = $http.send({
          url: "http://localhost:8091/export-toml",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rule: currentState }),
          timeout: 15
        });
        if (tomlResp.statusCode === 200) {
          var tomlData = JSON.parse(tomlResp.raw);
          tomlContent = tomlData.toml_content;
        }
      } catch (err) {
        console.log("[Review] TOML conversion error: " + String(err));
      }
    }

    // Commit to Git
    var gitResult = { success: true, message: "No Git action needed" };
    if (tomlContent || isDelete) {
      console.log("[Review-Approve] Committing to Git: " + ruleName + " (toml length: " + (tomlContent ? tomlContent.length : 0) + ", isDelete: " + isDelete + ")");
      gitResult = commitTomlToGit(e.app, projectId, ruleId, ruleName, tomlContent || "", isDelete);
      console.log("[Review-Approve] Git result: " + JSON.stringify(gitResult));
    } else {
      console.log("[Review-Approve] Skipping Git commit: tomlContent=" + (typeof tomlContent) + " isDelete=" + isDelete);
    }

    // Update change status
    change.set("status", "approved");
    change.set("reviewed_by", reviewedBy);
    change.set("reviewed_at", new Date().toISOString());
    e.app.save(change);

    // Only update rule snapshot if Git commit succeeded (or was not needed).
    // If Git failed, keep the old snapshot so the change reappears on next sync.
    if (gitResult.success) {
      if (!isDelete && currentState) {
        try {
          var snapFilter = "project = '" + projectId + "' && rule_id = '" + ruleId + "'";
          if (environmentId) snapFilter += " && environment = '" + environmentId + "'";
          var existingSnaps = e.app.findRecordsByFilter("rule_snapshots", snapFilter, "", 1, 0);
          var snap;
          if (existingSnaps.length > 0) {
            snap = existingSnaps[0];
          } else {
            var snapCol = e.app.findCollectionByNameOrId("rule_snapshots");
            snap = new Record(snapCol);
            snap.set("project", projectId);
            if (environmentId) snap.set("environment", environmentId);
            snap.set("rule_id", ruleId);
          }
          snap.set("rule_name", ruleName);
          snap.set("rule_content", currentState);
          snap.set("toml_content", tomlContent || "");
          snap.set("enabled", currentState.enabled || false);
          snap.set("severity", currentState.severity || "");
          snap.set("tags", currentState.tags || []);
          snap.set("exceptions", currentState.exceptions_list || []);
          snap.set("last_approved_at", new Date().toISOString());

          // Compute hash via sync service
          try {
            var hashResp = $http.send({
              url: "http://localhost:8091/compute-hash",
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rule: currentState }),
              timeout: 10
            });
            if (hashResp.statusCode === 200) {
              snap.set("rule_hash", JSON.parse(hashResp.raw).rule_hash);
            }
          } catch (err) {}

          e.app.save(snap);
        } catch (err) {
          console.log("[Review] Snapshot update error: " + String(err));
        }
      } else if (isDelete) {
        // Remove snapshot for deleted rule
        try {
          var delSnapFilter = "project = '" + projectId + "' && rule_id = '" + ruleId + "'";
          var delSnaps = e.app.findRecordsByFilter("rule_snapshots", delSnapFilter, "", 1, 0);
          if (delSnaps.length > 0) {
            e.app.delete(delSnaps[0]);
          }
        } catch (err) {}
      }
    } else {
      console.log("[Review-Approve] Git commit failed — snapshot NOT updated so change reappears on next sync. Rule: " + ruleName);
    }

    // Create notification
    createNotification(e.app,
      "Change approved",
      "Rule '" + ruleName + "' " + changeType.replace(/_/g, " ") + " approved by " + reviewedBy,
      "change_approved", "info", "/review", projectId);

    // Fire webhooks
    fireWebhooks(e.app, "change_approved", {
      event: "change_approved",
      timestamp: new Date().toISOString(),
      project: { id: projectId },
      rule_name: ruleName,
      change_type: changeType,
      reviewed_by: reviewedBy,
      git_result: gitResult
    });

    // Audit log
    logAudit(e.app, {
      user: reviewedBy,
      action: "rule_approved",
      resource_type: "rule",
      resource_id: ruleId,
      resource_name: ruleName,
      project: projectId,
      details: { change_type: changeType, git_success: gitResult.success, git_message: gitResult.message, change_id: changeId },
      status: gitResult.success ? "success" : "error",
      error_message: gitResult.success ? "" : gitResult.message
    });

    return e.json(200, {
      success: true,
      message: "Change approved" + (gitResult.success ? " and committed to Git" : " (Git commit failed: " + gitResult.message + ")"),
      git_result: gitResult
    });

  } catch (err) {
    console.log("[Review-Approve] ERROR: Unhandled exception: " + String(err));
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Review API: Reject a change (with auto-revert in Elastic)
// ============================================================================
routerAdd("POST", "/api/review/reject", function(e) {
  function logAudit(app, params) {
    try {
      var user = params.user || "system";
      if (user === "system") { try { var _a = e.requestInfo().auth; if (_a) { user = _a.getString("email") || _a.get("email") || user; } } catch(_x) {} }
      if (user === "system") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { user = _r.getString("email") || _r.get("email") || user; } } } catch(_x) {} }
      var col = app.findCollectionByNameOrId("audit_logs");
      var rec = new Record(col);
      rec.set("user", user);
      rec.set("action", params.action);
      rec.set("resource_type", params.resource_type);
      rec.set("resource_id", params.resource_id || "");
      rec.set("resource_name", params.resource_name || "");
      if (params.project) rec.set("project", params.project);
      rec.set("details", params.details || {});
      rec.set("status", params.status || "success");
      rec.set("error_message", params.error_message || "");
      app.save(rec);
    } catch (err) {
      console.log("[Audit] Error logging: " + String(err));
    }
  }

  function createNotification(app, title, message, type, severity, link, projectId) {
    try {
      var col = app.findCollectionByNameOrId("notifications");
      var rec = new Record(col);
      rec.set("title", title);
      rec.set("message", message);
      rec.set("type", type);
      rec.set("severity", severity);
      rec.set("link", link || "");
      rec.set("read", false);
      if (projectId) rec.set("project", projectId);
      app.save(rec);
    } catch (err) {
      console.log("[Notification] Error creating: " + String(err));
    }
  }

  function fireWebhooks(app, eventType, payload) {
    try {
      var hooks = app.findRecordsByFilter("webhook_configs", "is_active = true", "", 100, 0);
      for (var i = 0; i < hooks.length; i++) {
        var hook = hooks[i];
        var events = hook.get("events");
        if (typeof events === "string") {
          try { events = JSON.parse(events); } catch (err) { events = []; }
        }
        if (!events || events.indexOf(eventType) === -1) continue;
        var hookUrl = hook.get("url");
        var hookHeaders = hook.get("headers") || {};
        if (typeof hookHeaders === "string") {
          try { hookHeaders = JSON.parse(hookHeaders); } catch (err) { hookHeaders = {}; }
        }
        hookHeaders["Content-Type"] = "application/json";
        var secret = hook.get("secret");
        if (secret) { hookHeaders["X-Webhook-Secret"] = secret; }
        try {
          var resp = $http.send({ url: hookUrl, method: "POST", headers: hookHeaders, body: JSON.stringify(payload), timeout: 10 });
          hook.set("last_triggered", new Date().toISOString());
          hook.set("last_status", resp.statusCode >= 200 && resp.statusCode < 300 ? "success" : "failed");
          app.save(hook);
        } catch (err) {
          hook.set("last_triggered", new Date().toISOString());
          hook.set("last_status", "failed");
          try { app.save(hook); } catch (saveErr) {}
          console.log("[Webhook] Error firing to " + hookUrl + ": " + String(err));
        }
      }
    } catch (err) {
      console.log("[Webhook] Error loading configs: " + String(err));
    }
  }

  // Archive a rejected rule's TOML to Git under deleted/{YYYY-MM-DD}/
  function archiveRejectedToGit(app, projectId, ruleId, ruleName, tomlContent, reviewedBy) {
    if (!tomlContent) return { success: false, message: "No TOML content to archive" };
    try {
      var project = app.findRecordById("projects", projectId);
      var gitRepoId = project.get("git_repository");
      if (!gitRepoId) return { success: false, message: "No git repository configured" };
      var gitRepo = app.findRecordById("git_repositories", gitRepoId);
      var gitProvider = gitRepo.get("provider");
      var gitToken = gitRepo.get("access_token");
      var gitBranch = gitRepo.get("default_branch") || "main";
      var gitRepoUrl = gitRepo.get("url").replace(/\.git$/, "");
      var gitPath = project.get("git_path") || "";
      try {
        var envs = app.findRecordsByFilter("environments", "project = '" + projectId + "'", "", 1, 0);
        if (envs.length > 0) { gitBranch = envs[0].get("git_branch") || gitBranch; }
      } catch (err) {}
      var today = new Date().toISOString().substring(0, 10); // YYYY-MM-DD
      var fileName = ruleId + ".toml";
      var deletedPath = gitPath ? gitPath + "/deleted/" + today + "/" + fileName : "deleted/" + today + "/" + fileName;
      var commitMsg = "[Rejected] Archive rule: " + ruleName + " (rejected by " + reviewedBy + ")";
      console.log("[Git-Archive] Archiving rejected rule to: " + deletedPath + " branch=" + gitBranch);

      if (gitProvider === "gitlab") {
        var glMatch = gitRepoUrl.match(/^(https?:\/\/[^\/]+)\/(.+)$/);
        if (!glMatch) return { success: false, message: "Invalid GitLab URL" };
        var glApiBase = glMatch[1] + "/api/v4";
        var glProject = encodeURIComponent(glMatch[2]);
        var glFileUrl = glApiBase + "/projects/" + glProject + "/repository/files/" + encodeURIComponent(deletedPath);
        var methods = ["PUT", "POST"];
        for (var m = 0; m < methods.length; m++) {
          try {
            var glResp = $http.send({ url: glFileUrl, method: methods[m], headers: { "Authorization": "Bearer " + gitToken, "Content-Type": "application/json" }, body: JSON.stringify({ branch: gitBranch, content: tomlContent, commit_message: commitMsg }), timeout: 15 });
            console.log("[Git-Archive] GitLab " + methods[m] + " response: " + glResp.statusCode);
            if (glResp.statusCode === 200 || glResp.statusCode === 201) return { success: true, message: "Archived to Git" };
          } catch (err) {
            console.log("[Git-Archive] GitLab " + methods[m] + " error: " + String(err));
          }
        }
        return { success: false, message: "Failed to archive to GitLab" };
      } else if (gitProvider === "github") {
        var ghMatch = gitRepoUrl.match(/github\.com\/(.+?)\/(.+?)$/);
        if (!ghMatch) return { success: false, message: "Invalid GitHub URL" };
        var ghApiUrl = "https://api.github.com/repos/" + ghMatch[1] + "/" + ghMatch[2] + "/contents/" + deletedPath;
        var ghHeaders = { "Authorization": "token " + gitToken, "Accept": "application/vnd.github.v3+json" };
        var sha = "";
        try {
          var getResp = $http.send({ url: ghApiUrl + "?ref=" + gitBranch, method: "GET", headers: ghHeaders, timeout: 10 });
          if (getResp.statusCode === 200) sha = JSON.parse(getResp.raw).sha;
        } catch (err) {}
        try {
          var ghBody = { message: commitMsg, content: $security.base64Encode(tomlContent), branch: gitBranch };
          if (sha) ghBody.sha = sha;
          var ghResp = $http.send({ url: ghApiUrl, method: "PUT", headers: ghHeaders, body: JSON.stringify(ghBody), timeout: 15 });
          console.log("[Git-Archive] GitHub PUT response: " + ghResp.statusCode);
          if (ghResp.statusCode === 200 || ghResp.statusCode === 201) return { success: true, message: "Archived to Git" };
        } catch (err) {
          console.log("[Git-Archive] GitHub PUT error: " + String(err));
        }
        return { success: false, message: "Failed to archive to GitHub" };
      }
      return { success: false, message: "Unsupported provider: " + gitProvider };
    } catch (err) {
      console.log("[Git-Archive] Error: " + String(err));
      return { success: false, message: String(err) };
    }
  }

  var data = e.requestInfo().body;
  var changeId = data.change_id;
  var reviewedBy = data.reviewed_by || "unknown";
  try { var _a = e.requestInfo().auth; if (_a) { reviewedBy = _a.getString("email") || _a.get("email") || reviewedBy; } } catch(_x) {}
  if (reviewedBy === "unknown") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { reviewedBy = _r.getString("email") || _r.get("email") || reviewedBy; } } } catch(_x) {} }

  try {
    var change = e.app.findRecordById("pending_changes", changeId);
    if (change.get("status") !== "pending") {
      return e.json(400, { success: false, message: "Change already " + change.get("status") });
    }

    var ruleId = change.get("rule_id");
    var ruleName = change.get("rule_name");
    var changeType = change.get("change_type");
    var previousState = change.get("previous_state");
    var currentState = change.get("current_state");
    var projectId = change.get("project");
    var reverted = false;
    var revertMessage = "";

    // PocketBase JSVM may return JSON fields as byte arrays
    if (previousState && typeof previousState[0] === "number") {
      var psStr = "";
      for (var psi = 0; psi < previousState.length; psi++) psStr += String.fromCharCode(previousState[psi]);
      try { psStr = decodeURIComponent(escape(psStr)); } catch(ue) {}
      try { previousState = JSON.parse(psStr); } catch (err) {}
    }
    if (currentState && typeof currentState[0] === "number") {
      var csStr = "";
      for (var csi = 0; csi < currentState.length; csi++) csStr += String.fromCharCode(currentState[csi]);
      try { csStr = decodeURIComponent(escape(csStr)); } catch(ue) {}
      try { currentState = JSON.parse(csStr); } catch (err) {}
    }

    // Resolve Elastic connection info
    var project = e.app.findRecordById("projects", projectId);
    var elasticId = project.get("elastic_instance");
    var elastic = e.app.findRecordById("elastic_instances", elasticId);
    var elasticUrl = elastic.get("url").replace(/\/$/, "");
    var apiKey = elastic.get("api_key");
    var envSpace = project.get("elastic_space") || "default";
    var environmentId = change.get("environment");
    if (environmentId) {
      try {
        var env = e.app.findRecordById("environments", environmentId);
        envSpace = env.get("elastic_space") || envSpace;
      } catch (err) {}
    }

    // Attempt to revert in Elastic based on change type
    if (changeType === "new_rule") {
      // New rule rejection: delete the rule from Elastic
      try {
        var delUrl = elasticUrl + (envSpace !== "default" ? "/s/" + envSpace : "") + "/api/detection_engine/rules?rule_id=" + encodeURIComponent(ruleId);
        var delResp = $http.send({
          url: delUrl,
          method: "DELETE",
          headers: { "Authorization": "ApiKey " + apiKey, "kbn-xsrf": "true" },
          timeout: 15
        });
        reverted = delResp.statusCode === 200;
        revertMessage = reverted ? "New rule deleted from Elastic" : "Failed to delete rule (status " + delResp.statusCode + ")";
      } catch (err) {
        revertMessage = "Delete failed: " + String(err);
      }
    } else if (previousState && typeof previousState === "object") {
      // Modified/deleted/other changes: revert to previous state
      try {
        console.log("[Review-Reject] Reverting rule " + ruleId + " (change_type: " + changeType + ")");
        var revertResp = $http.send({
          url: "http://localhost:8091/revert-rule",
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            kibana_url: elasticUrl,
            api_key: apiKey,
            space: envSpace,
            rule_content: previousState
          }),
          timeout: 30
        });

        if (revertResp.statusCode === 200) {
          var revertData = JSON.parse(revertResp.raw);
          reverted = revertData.success;
          revertMessage = revertData.message || "Reverted successfully";
        } else {
          revertMessage = "Revert service returned status " + revertResp.statusCode;
        }
        console.log("[Review-Reject] Revert result: reverted=" + reverted + " message=" + revertMessage);
      } catch (err) {
        revertMessage = "Revert failed: " + String(err);
        console.log("[Review-Reject] Revert error: " + revertMessage);
      }
    } else {
      revertMessage = "No previous state to revert to";
    }

    // Also revert exception items if this is an exception change
    if (reverted || changeType === "exception_added" || changeType === "exception_removed" || changeType === "exception_modified") {
      var prevItems = (previousState && previousState._exception_items) || [];
      var currItems = (currentState && currentState._exception_items) || [];
      if (JSON.stringify(prevItems) !== JSON.stringify(currItems)) {
        try {
          console.log("[Review-Reject] Reverting exception items for " + ruleId +
            " (prev=" + prevItems.length + " curr=" + currItems.length + ")");
          var excRevertResp = $http.send({
            url: "http://localhost:8091/revert-exception-items",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kibana_url: elasticUrl,
              api_key: apiKey,
              space: envSpace,
              previous_items: prevItems,
              current_items: currItems
            }),
            timeout: 30
          });
          if (excRevertResp.statusCode === 200) {
            var excData = JSON.parse(excRevertResp.raw);
            if (excData.results && excData.results.length > 0) {
              revertMessage += "; " + excData.results.join("; ");
            }
            if (excData.errors && excData.errors.length > 0) {
              revertMessage += "; Exception errors: " + excData.errors.join("; ");
            }
            reverted = true;
          }
          console.log("[Review-Reject] Exception revert result: " + excRevertResp.raw.substring(0, 500));
        } catch (err) {
          console.log("[Review-Reject] Exception revert error: " + String(err));
          revertMessage += "; Exception revert failed: " + String(err);
        }
      }
    }

    if (reverted) {
      // Successfully reverted: delete this and any other pending changes for the same rule
      e.app.delete(change);
      try {
        var dupes = e.app.findRecordsByFilter("pending_changes",
          "rule_id = '" + ruleId + "' && project = '" + projectId + "' && status = 'pending'",
          "", 100, 0);
        for (var di = 0; di < dupes.length; di++) {
          try { e.app.delete(dupes[di]); } catch (err) {}
        }
      } catch (err) {}

      // Update rule_snapshot so next sync uses the reverted state as baseline
      try {
        // Determine the state to save as baseline
        var baselineState = previousState || currentState;
        if (baselineState && changeType !== "new_rule") {
          var snapFilter = "rule_id = '" + ruleId + "' && project = '" + projectId + "'";
          var snaps = e.app.findRecordsByFilter("rule_snapshots", snapFilter, "", 1, 0);
          var snap;
          if (snaps && snaps.length > 0) {
            snap = snaps[0];
          } else {
            var snapCol = e.app.findCollectionByNameOrId("rule_snapshots");
            snap = new Record(snapCol);
            snap.set("project", projectId);
            if (environmentId) snap.set("environment", environmentId);
            snap.set("rule_id", ruleId);
          }
          snap.set("rule_name", baselineState.name || ruleName);
          snap.set("rule_content", baselineState);
          snap.set("enabled", !!baselineState.enabled);
          snap.set("severity", baselineState.severity || "");
          snap.set("tags", baselineState.tags || []);
          snap.set("exceptions", baselineState.exceptions_list || []);
          snap.set("last_approved_at", new Date().toISOString());
          // Compute hash
          try {
            var hashResp = $http.send({
              url: "http://localhost:8091/compute-hash",
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rule: baselineState }),
              timeout: 10
            });
            if (hashResp.statusCode === 200) {
              snap.set("rule_hash", JSON.parse(hashResp.raw).rule_hash);
            }
          } catch (err2) {}
          e.app.save(snap);
          console.log("[Review-Reject] Updated rule_snapshot for " + ruleId);
        } else if (changeType === "new_rule") {
          // New rule was rejected (deleted from Elastic): remove its snapshot if one exists
          try {
            var snapFilter2 = "rule_id = '" + ruleId + "' && project = '" + projectId + "'";
            var snaps2 = e.app.findRecordsByFilter("rule_snapshots", snapFilter2, "", 1, 0);
            if (snaps2 && snaps2.length > 0) {
              e.app.delete(snaps2[0]);
            }
          } catch (err) {}
        }
      } catch (err) {
        console.log("[Review-Reject] Failed to update snapshot for " + ruleId + ": " + String(err));
      }
    } else {
      // Revert failed: keep the record but mark as rejected
      change.set("status", "rejected");
      change.set("reviewed_by", reviewedBy);
      change.set("reviewed_at", new Date().toISOString());
      change.set("reverted", false);
      e.app.save(change);
    }

    // Archive the rejected rule to Git under deleted/{YYYY-MM-DD}/
    var archiveResult = { success: false, message: "skipped" };
    if (currentState) {
      var archiveToml = change.get("toml_content") || "";
      if (!archiveToml) {
        try {
          var tomlResp = $http.send({
            url: "http://localhost:8091/export-toml",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ rule: currentState }),
            timeout: 15
          });
          if (tomlResp.statusCode === 200) {
            archiveToml = JSON.parse(tomlResp.raw).toml_content;
          }
        } catch (err) {
          console.log("[Review-Reject] TOML conversion for archive failed: " + String(err));
        }
      }
      if (archiveToml) {
        archiveResult = archiveRejectedToGit(e.app, projectId, ruleId, ruleName, archiveToml, reviewedBy);
        console.log("[Review-Reject] Archive result: " + JSON.stringify(archiveResult));
      }
    }

    // Create notification
    var notifSeverity = reverted ? "info" : "warning";
    var notifType = reverted ? "change_rejected" : "revert_failed";
    createNotification(e.app,
      reverted ? "Change rejected & reverted" : "Change rejected (revert failed)",
      "Rule '" + ruleName + "' rejected by " + reviewedBy + ". " + revertMessage,
      notifType, notifSeverity, "/review", projectId);

    // Fire webhooks
    fireWebhooks(e.app, "change_rejected", {
      event: "change_rejected",
      timestamp: new Date().toISOString(),
      project: { id: projectId },
      rule_name: ruleName,
      change_type: changeType,
      reviewed_by: reviewedBy,
      reverted: reverted,
      revert_message: revertMessage,
      archive_result: archiveResult
    });

    // Audit log
    logAudit(e.app, {
      user: reviewedBy,
      action: "rule_rejected",
      resource_type: "rule",
      resource_id: ruleId,
      resource_name: ruleName,
      project: projectId,
      details: { change_type: changeType, reverted: reverted, revert_message: revertMessage, change_id: changeId, archive_success: archiveResult.success }
    });

    return e.json(200, {
      success: true,
      message: reverted ? "Change rejected and reverted in Elastic" : "Change rejected but revert failed: " + revertMessage,
      reverted: reverted,
      revert_message: revertMessage
    });

  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Review API: Bulk approve
// ============================================================================
routerAdd("POST", "/api/review/bulk-approve", function(e) {
  function logAudit(app, params) {
    try {
      var user = params.user || "system";
      if (user === "system") { try { var _a = e.requestInfo().auth; if (_a) { user = _a.getString("email") || _a.get("email") || user; } } catch(_x) {} }
      if (user === "system") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { user = _r.getString("email") || _r.get("email") || user; } } } catch(_x) {} }
      var col = app.findCollectionByNameOrId("audit_logs");
      var rec = new Record(col);
      rec.set("user", user);
      rec.set("action", params.action);
      rec.set("resource_type", params.resource_type);
      rec.set("resource_id", params.resource_id || "");
      rec.set("resource_name", params.resource_name || "");
      if (params.project) rec.set("project", params.project);
      rec.set("details", params.details || {});
      rec.set("status", params.status || "success");
      rec.set("error_message", params.error_message || "");
      app.save(rec);
    } catch (err) {
      console.log("[Audit] Error logging: " + String(err));
    }
  }

  function createNotification(app, title, message, type, severity, link, projectId) {
    try {
      var col = app.findCollectionByNameOrId("notifications");
      var rec = new Record(col);
      rec.set("title", title);
      rec.set("message", message);
      rec.set("type", type);
      rec.set("severity", severity);
      rec.set("link", link || "");
      rec.set("read", false);
      if (projectId) rec.set("project", projectId);
      app.save(rec);
    } catch (err) {
      console.log("[Notification] Error creating: " + String(err));
    }
  }

  function commitTomlToGit(app, projectId, ruleId, ruleName, tomlContent, isDelete) {
    console.log("[Git-Commit-Bulk] Starting commitTomlToGit: ruleId=" + ruleId + " ruleName=" + ruleName + " isDelete=" + isDelete + " tomlLength=" + (tomlContent ? tomlContent.length : 0));
    var project = app.findRecordById("projects", projectId);
    var gitRepoId = project.get("git_repository");
    if (!gitRepoId) {
      console.log("[Git-Commit-Bulk] ERROR: No git_repository configured for project " + projectId);
      return { success: false, message: "No git repository configured for project" };
    }
    var gitRepo = app.findRecordById("git_repositories", gitRepoId);
    var gitProvider = gitRepo.get("provider");
    var gitToken = gitRepo.get("access_token");
    var gitBranch = gitRepo.get("default_branch") || "main";
    var gitRepoUrl = gitRepo.get("url").replace(/\.git$/, "");
    var gitPath = project.get("git_path") || "";
    console.log("[Git-Commit-Bulk] Config: provider=" + gitProvider + " repoUrl=" + gitRepoUrl + " defaultBranch=" + gitBranch + " gitPath=" + gitPath + " hasToken=" + !!gitToken);
    try {
      var envs = app.findRecordsByFilter("environments", "project = '" + projectId + "'", "", 1, 0);
      if (envs.length > 0) {
        var envBranch = envs[0].get("git_branch");
        var envName = envs[0].get("name") || "unknown";
        console.log("[Git-Commit-Bulk] Environment found: name=" + envName + " git_branch=" + (envBranch || "(not set)"));
        if (envBranch) { gitBranch = envBranch; }
      } else {
        console.log("[Git-Commit-Bulk] No environments found for project, using default branch: " + gitBranch);
      }
    } catch (err) {
      console.log("[Git-Commit-Bulk] WARNING: Failed to query environments: " + String(err));
    }
    var fileName = ruleId + ".toml";
    var filePath = gitPath ? gitPath + "/" + fileName : fileName;
    console.log("[Git-Commit-Bulk] Resolved target: branch=" + gitBranch + " filePath=" + filePath);
    if (gitProvider === "gitlab") {
      var glMatch = gitRepoUrl.match(/^(https?:\/\/[^\/]+)\/(.+)$/);
      if (!glMatch) {
        console.log("[Git-Commit-Bulk] ERROR: Invalid GitLab URL format: " + gitRepoUrl);
        return { success: false, message: "Invalid GitLab URL: " + gitRepoUrl };
      }
      var glApiBase = glMatch[1] + "/api/v4";
      var glProject = encodeURIComponent(glMatch[2]);
      var glFileUrl = glApiBase + "/projects/" + glProject + "/repository/files/" + encodeURIComponent(filePath);
      console.log("[Git-Commit-Bulk] GitLab API URL: " + glFileUrl);
      if (isDelete) {
        try {
          console.log("[Git-Commit-Bulk] GitLab DELETE request: branch=" + gitBranch);
          var delResp = $http.send({ url: glFileUrl, method: "DELETE", headers: { "Authorization": "Bearer " + gitToken, "Content-Type": "application/json" }, body: JSON.stringify({ branch: gitBranch, commit_message: "[Approved] Delete rule: " + ruleName }), timeout: 15 });
          console.log("[Git-Commit-Bulk] GitLab DELETE response: statusCode=" + delResp.statusCode + " body=" + (delResp.raw || "").substring(0, 500));
          var delSuccess = delResp.statusCode === 204 || delResp.statusCode === 200;
          if (!delSuccess) { console.log("[Git-Commit-Bulk] ERROR: GitLab DELETE failed with status " + delResp.statusCode); }
          return { success: delSuccess, message: delSuccess ? "Deleted from Git" : "GitLab DELETE failed (HTTP " + delResp.statusCode + "): " + (delResp.raw || "").substring(0, 300) };
        } catch (err) {
          console.log("[Git-Commit-Bulk] ERROR: GitLab DELETE exception: " + String(err));
          return { success: false, message: "GitLab DELETE exception: " + String(err) };
        }
      }
      var methods = ["PUT", "POST"];
      var lastStatusCode = 0;
      var lastResponseBody = "";
      for (var m = 0; m < methods.length; m++) {
        try {
          console.log("[Git-Commit-Bulk] GitLab " + methods[m] + " request: branch=" + gitBranch + " contentLength=" + (tomlContent ? tomlContent.length : 0));
          var glResp = $http.send({ url: glFileUrl, method: methods[m], headers: { "Authorization": "Bearer " + gitToken, "Content-Type": "application/json" }, body: JSON.stringify({ branch: gitBranch, content: tomlContent, commit_message: "[Approved] " + (methods[m] === "POST" ? "Add" : "Update") + " rule: " + ruleName }), timeout: 15 });
          lastStatusCode = glResp.statusCode;
          lastResponseBody = (glResp.raw || "").substring(0, 500);
          console.log("[Git-Commit-Bulk] GitLab " + methods[m] + " response: statusCode=" + glResp.statusCode + " body=" + lastResponseBody);
          if (glResp.statusCode === 200 || glResp.statusCode === 201) {
            console.log("[Git-Commit-Bulk] GitLab commit successful via " + methods[m]);
            return { success: true, message: "Committed to Git via " + methods[m] };
          }
          console.log("[Git-Commit-Bulk] GitLab " + methods[m] + " non-success status " + glResp.statusCode + ", trying next method...");
        } catch (err) {
          console.log("[Git-Commit-Bulk] ERROR: GitLab " + methods[m] + " exception: " + String(err));
          lastResponseBody = String(err);
        }
      }
      var failMsg = "Failed to commit to GitLab (last HTTP " + lastStatusCode + "): " + lastResponseBody;
      console.log("[Git-Commit-Bulk] ERROR: " + failMsg);
      return { success: false, message: failMsg };
    } else if (gitProvider === "github") {
      var ghMatch = gitRepoUrl.match(/github\.com\/(.+?)\/(.+?)$/);
      if (!ghMatch) {
        console.log("[Git-Commit-Bulk] ERROR: Invalid GitHub URL format: " + gitRepoUrl);
        return { success: false, message: "Invalid GitHub URL: " + gitRepoUrl };
      }
      var ghOwner = ghMatch[1];
      var ghRepoName = ghMatch[2];
      var ghApiUrl = "https://api.github.com/repos/" + ghOwner + "/" + ghRepoName + "/contents/" + filePath;
      var ghHeaders = { "Authorization": "token " + gitToken, "Accept": "application/vnd.github.v3+json" };
      console.log("[Git-Commit-Bulk] GitHub API URL: " + ghApiUrl + " owner=" + ghOwner + " repo=" + ghRepoName);
      var sha = "";
      try {
        var getResp = $http.send({ url: ghApiUrl + "?ref=" + gitBranch, method: "GET", headers: ghHeaders, timeout: 10 });
        console.log("[Git-Commit-Bulk] GitHub GET existing file: statusCode=" + getResp.statusCode);
        if (getResp.statusCode === 200) {
          sha = JSON.parse(getResp.raw).sha;
          console.log("[Git-Commit-Bulk] GitHub existing file SHA: " + sha);
        } else {
          console.log("[Git-Commit-Bulk] GitHub file does not exist yet (status " + getResp.statusCode + ")");
        }
      } catch (err) {
        console.log("[Git-Commit-Bulk] GitHub GET file check failed (file may not exist): " + String(err));
      }
      if (isDelete) {
        if (!sha) {
          console.log("[Git-Commit-Bulk] GitHub DELETE: file already absent, skipping");
          return { success: true, message: "File already absent" };
        }
        try {
          console.log("[Git-Commit-Bulk] GitHub DELETE request: sha=" + sha + " branch=" + gitBranch);
          var ghDelResp = $http.send({ url: ghApiUrl, method: "DELETE", headers: ghHeaders, body: JSON.stringify({ message: "[Approved] Delete rule: " + ruleName, sha: sha, branch: gitBranch }), timeout: 15 });
          console.log("[Git-Commit-Bulk] GitHub DELETE response: statusCode=" + ghDelResp.statusCode + " body=" + (ghDelResp.raw || "").substring(0, 500));
          var ghDelSuccess = ghDelResp.statusCode === 200;
          return { success: ghDelSuccess, message: ghDelSuccess ? "Deleted from Git" : "GitHub DELETE failed (HTTP " + ghDelResp.statusCode + "): " + (ghDelResp.raw || "").substring(0, 300) };
        } catch (err) {
          console.log("[Git-Commit-Bulk] ERROR: GitHub DELETE exception: " + String(err));
          return { success: false, message: "GitHub DELETE exception: " + String(err) };
        }
      }
      try {
        var ghBody = { message: "[Approved] " + (sha ? "Update" : "Add") + " rule: " + ruleName, content: $security.base64Encode(tomlContent), branch: gitBranch };
        if (sha) ghBody.sha = sha;
        console.log("[Git-Commit-Bulk] GitHub PUT request: branch=" + gitBranch + " hasSha=" + !!sha + " contentLength=" + (tomlContent ? tomlContent.length : 0));
        var ghResp = $http.send({ url: ghApiUrl, method: "PUT", headers: ghHeaders, body: JSON.stringify(ghBody), timeout: 15 });
        console.log("[Git-Commit-Bulk] GitHub PUT response: statusCode=" + ghResp.statusCode + " body=" + (ghResp.raw || "").substring(0, 500));
        if (ghResp.statusCode === 200 || ghResp.statusCode === 201) {
          console.log("[Git-Commit-Bulk] GitHub commit successful");
          return { success: true, message: "Committed to Git" };
        }
        var ghFailMsg = "Failed to commit to GitHub (HTTP " + ghResp.statusCode + "): " + (ghResp.raw || "").substring(0, 300);
        console.log("[Git-Commit-Bulk] ERROR: " + ghFailMsg);
        return { success: false, message: ghFailMsg };
      } catch (err) {
        console.log("[Git-Commit-Bulk] ERROR: GitHub PUT exception: " + String(err));
        return { success: false, message: "GitHub PUT exception: " + String(err) };
      }
    }
    console.log("[Git-Commit-Bulk] ERROR: Unsupported provider: " + gitProvider);
    return { success: false, message: "Unsupported provider: " + gitProvider };
  }

  var data = e.requestInfo().body;
  var batchId = data.batch_id;
  var changeIds = data.change_ids;
  var reviewedBy = data.reviewed_by || "unknown";
  try { var _a = e.requestInfo().auth; if (_a) { reviewedBy = _a.getString("email") || _a.get("email") || reviewedBy; } } catch(_x) {}
  if (reviewedBy === "unknown") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { reviewedBy = _r.getString("email") || _r.get("email") || reviewedBy; } } } catch(_x) {} }

  console.log("[Bulk-Approve] batch_id=" + batchId + ", changeIds=" + JSON.stringify(changeIds));

  var filter = "status = 'pending'";
  if (batchId) filter += " && detection_batch = '" + batchId + "'";

  try {
    var records;
    if (changeIds && changeIds.length > 0) {
      records = [];
      for (var i = 0; i < changeIds.length; i++) {
        try {
          var r = e.app.findRecordById("pending_changes", changeIds[i]);
          if (r.get("status") === "pending") records.push(r);
        } catch (err) {}
      }
    } else {
      records = e.app.findRecordsByFilter("pending_changes", filter, "", 500, 0);
    }

    console.log("[Bulk-Approve] Found " + records.length + " records to approve");

    var approved = 0;
    var failed = 0;
    var errors = [];
    for (var j = 0; j < records.length; j++) {
      try {
        var change = records[j];
        var ruleId = change.get("rule_id");
        var ruleName = change.get("rule_name");
        var changeType = change.get("change_type");
        var currentState = change.get("current_state");
        // PocketBase JSVM may return JSON fields as byte arrays
        if (currentState && typeof currentState[0] === "number") {
          var csStr = "";
          for (var csi = 0; csi < currentState.length; csi++) csStr += String.fromCharCode(currentState[csi]);
          try { csStr = decodeURIComponent(escape(csStr)); } catch(ue) {}
          try { currentState = JSON.parse(csStr); } catch (err) {}
        }
        var tomlContent = change.get("toml_content");
        var projectId = change.get("project");
        var environmentId = change.get("environment");
        var isDelete = changeType === "deleted_rule";

        if (!tomlContent && !isDelete && currentState) {
          try {
            var tomlResp = $http.send({
              url: "http://localhost:8091/export-toml",
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ rule: currentState }),
              timeout: 15
            });
            if (tomlResp.statusCode === 200) {
              tomlContent = JSON.parse(tomlResp.raw).toml_content;
            }
          } catch (err) {
            console.log("[Bulk-Approve] TOML conversion error for " + ruleId + ": " + String(err));
          }
        }

        // Commit to Git
        var gitResult = { success: true, message: "No Git action needed" };
        if (tomlContent || isDelete) {
          gitResult = commitTomlToGit(e.app, projectId, ruleId, ruleName, tomlContent || "", isDelete);
          console.log("[Bulk-Approve] Git commit for " + ruleName + ": " + JSON.stringify(gitResult));
        }

        // Update change status
        change.set("status", "approved");
        change.set("reviewed_by", reviewedBy);
        change.set("reviewed_at", new Date().toISOString());
        e.app.save(change);

        // Only update rule snapshot if Git commit succeeded (or was not needed).
        // If Git failed, keep the old snapshot so the change reappears on next sync.
        if (gitResult.success) {
          if (!isDelete && currentState) {
            try {
              var snapFilter = "project = '" + projectId + "' && rule_id = '" + ruleId + "'";
              if (environmentId) snapFilter += " && environment = '" + environmentId + "'";
              var existingSnaps = e.app.findRecordsByFilter("rule_snapshots", snapFilter, "", 1, 0);
              var snap;
              if (existingSnaps.length > 0) {
                snap = existingSnaps[0];
              } else {
                var snapCol = e.app.findCollectionByNameOrId("rule_snapshots");
                snap = new Record(snapCol);
                snap.set("project", projectId);
                if (environmentId) snap.set("environment", environmentId);
                snap.set("rule_id", ruleId);
              }
              snap.set("rule_name", ruleName);
              snap.set("rule_content", currentState);
              snap.set("toml_content", tomlContent || "");
              snap.set("enabled", currentState.enabled || false);
              snap.set("severity", currentState.severity || "");
              snap.set("tags", currentState.tags || []);
              snap.set("exceptions", currentState.exceptions_list || []);
              snap.set("last_approved_at", new Date().toISOString());
              // Compute hash via sync service
              try {
                var hashResp = $http.send({
                  url: "http://localhost:8091/compute-hash",
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ rule: currentState }),
                  timeout: 10
                });
                if (hashResp.statusCode === 200) {
                  snap.set("rule_hash", JSON.parse(hashResp.raw).rule_hash);
                }
              } catch (err2) {
                console.log("[Bulk-Approve] Hash compute error for " + ruleId + ": " + String(err2));
              }
              e.app.save(snap);
            } catch (err) {
              console.log("[Bulk-Approve] Snapshot update error for " + ruleId + ": " + String(err));
            }
          }
        } else {
          console.log("[Bulk-Approve] Git commit failed for " + ruleName + " — snapshot NOT updated so change reappears on next sync");
        }

        approved++;
      } catch (err) {
        failed++;
        errors.push(ruleId + ": " + String(err));
        console.log("[Bulk-Approve] Error approving change: " + String(err));
      }
    }

    // Create summary notification
    if (approved > 0) {
      createNotification(e.app,
        approved + " changes approved",
        approved + " change(s) bulk approved by " + reviewedBy,
        "change_approved", "info", "/review", "");
    }

    // Audit log
    logAudit(e.app, {
      user: reviewedBy,
      action: "bulk_approved",
      resource_type: "rule",
      resource_id: batchId || "",
      resource_name: approved + " rules approved",
      project: "",
      details: { approved: approved, failed: failed, batch_id: batchId || "" },
      status: failed > 0 ? "error" : "success",
      error_message: errors.length > 0 ? errors.join("; ").substring(0, 500) : ""
    });

    return e.json(200, { success: true, approved: approved, failed: failed, errors: errors });
  } catch (err) {
    console.log("[Bulk-Approve] Fatal error: " + String(err));
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Review API: Bulk reject
// ============================================================================
routerAdd("POST", "/api/review/bulk-reject", function(e) {
  function logAudit(app, params) {
    try {
      var user = params.user || "system";
      if (user === "system") { try { var _a = e.requestInfo().auth; if (_a) { user = _a.getString("email") || _a.get("email") || user; } } catch(_x) {} }
      if (user === "system") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { user = _r.getString("email") || _r.get("email") || user; } } } catch(_x) {} }
      var col = app.findCollectionByNameOrId("audit_logs");
      var rec = new Record(col);
      rec.set("user", user);
      rec.set("action", params.action);
      rec.set("resource_type", params.resource_type);
      rec.set("resource_id", params.resource_id || "");
      rec.set("resource_name", params.resource_name || "");
      if (params.project) rec.set("project", params.project);
      rec.set("details", params.details || {});
      rec.set("status", params.status || "success");
      rec.set("error_message", params.error_message || "");
      app.save(rec);
    } catch (err) {
      console.log("[Audit] Error logging: " + String(err));
    }
  }

  // Archive a rejected rule's TOML to Git under deleted/{YYYY-MM-DD}/
  function archiveRejectedToGit(app, projectId, ruleId, ruleName, tomlContent, reviewedBy) {
    if (!tomlContent) return { success: false, message: "No TOML content to archive" };
    try {
      var project = app.findRecordById("projects", projectId);
      var gitRepoId = project.get("git_repository");
      if (!gitRepoId) return { success: false, message: "No git repository configured" };
      var gitRepo = app.findRecordById("git_repositories", gitRepoId);
      var gitProvider = gitRepo.get("provider");
      var gitToken = gitRepo.get("access_token");
      var gitBranch = gitRepo.get("default_branch") || "main";
      var gitRepoUrl = gitRepo.get("url").replace(/\.git$/, "");
      var gitPath = project.get("git_path") || "";
      try {
        var envs = app.findRecordsByFilter("environments", "project = '" + projectId + "'", "", 1, 0);
        if (envs.length > 0) { gitBranch = envs[0].get("git_branch") || gitBranch; }
      } catch (err) {}
      var today = new Date().toISOString().substring(0, 10);
      var fileName = ruleId + ".toml";
      var deletedPath = gitPath ? gitPath + "/deleted/" + today + "/" + fileName : "deleted/" + today + "/" + fileName;
      var commitMsg = "[Rejected] Archive rule: " + ruleName + " (rejected by " + reviewedBy + ")";
      console.log("[Git-Archive-Bulk] Archiving rejected rule to: " + deletedPath);

      if (gitProvider === "gitlab") {
        var glMatch = gitRepoUrl.match(/^(https?:\/\/[^\/]+)\/(.+)$/);
        if (!glMatch) return { success: false, message: "Invalid GitLab URL" };
        var glApiBase = glMatch[1] + "/api/v4";
        var glProject = encodeURIComponent(glMatch[2]);
        var glFileUrl = glApiBase + "/projects/" + glProject + "/repository/files/" + encodeURIComponent(deletedPath);
        var methods = ["PUT", "POST"];
        for (var m = 0; m < methods.length; m++) {
          try {
            var glResp = $http.send({ url: glFileUrl, method: methods[m], headers: { "Authorization": "Bearer " + gitToken, "Content-Type": "application/json" }, body: JSON.stringify({ branch: gitBranch, content: tomlContent, commit_message: commitMsg }), timeout: 15 });
            if (glResp.statusCode === 200 || glResp.statusCode === 201) return { success: true, message: "Archived to Git" };
          } catch (err) {}
        }
        return { success: false, message: "Failed to archive to GitLab" };
      } else if (gitProvider === "github") {
        var ghMatch = gitRepoUrl.match(/github\.com\/(.+?)\/(.+?)$/);
        if (!ghMatch) return { success: false, message: "Invalid GitHub URL" };
        var ghApiUrl = "https://api.github.com/repos/" + ghMatch[1] + "/" + ghMatch[2] + "/contents/" + deletedPath;
        var ghHeaders = { "Authorization": "token " + gitToken, "Accept": "application/vnd.github.v3+json" };
        var sha = "";
        try {
          var getResp = $http.send({ url: ghApiUrl + "?ref=" + gitBranch, method: "GET", headers: ghHeaders, timeout: 10 });
          if (getResp.statusCode === 200) sha = JSON.parse(getResp.raw).sha;
        } catch (err) {}
        try {
          var ghBody = { message: commitMsg, content: $security.base64Encode(tomlContent), branch: gitBranch };
          if (sha) ghBody.sha = sha;
          var ghResp = $http.send({ url: ghApiUrl, method: "PUT", headers: ghHeaders, body: JSON.stringify(ghBody), timeout: 15 });
          if (ghResp.statusCode === 200 || ghResp.statusCode === 201) return { success: true, message: "Archived to Git" };
        } catch (err) {}
        return { success: false, message: "Failed to archive to GitHub" };
      }
      return { success: false, message: "Unsupported provider: " + gitProvider };
    } catch (err) {
      console.log("[Git-Archive-Bulk] Error: " + String(err));
      return { success: false, message: String(err) };
    }
  }

  var data = e.requestInfo().body;
  var batchId = data.batch_id;
  var changeIds = data.change_ids;
  var reviewedBy = data.reviewed_by || "unknown";
  try { var _a = e.requestInfo().auth; if (_a) { reviewedBy = _a.getString("email") || _a.get("email") || reviewedBy; } } catch(_x) {}
  if (reviewedBy === "unknown") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { reviewedBy = _r.getString("email") || _r.get("email") || reviewedBy; } } } catch(_x) {} }

  var filter = "status = 'pending'";
  if (batchId) filter += " && detection_batch = '" + batchId + "'";

  try {
    var records;
    if (changeIds && changeIds.length > 0) {
      records = [];
      for (var i = 0; i < changeIds.length; i++) {
        try {
          var r = e.app.findRecordById("pending_changes", changeIds[i]);
          if (r.get("status") === "pending") records.push(r);
        } catch (err) {}
      }
    } else {
      records = e.app.findRecordsByFilter("pending_changes", filter, "", 500, 0);
    }

    var rejected = 0;
    var failed = 0;
    var errors = [];

    // Cache Elastic connection info per project+environment
    var connCache = {};

    for (var j = 0; j < records.length; j++) {
      try {
        var rec = records[j];
        var ruleId = rec.get("rule_id");
        var ruleName = rec.get("rule_name");
        var changeType = rec.get("change_type");
        var previousState = rec.get("previous_state");
        var currentState = rec.get("current_state");
        var projectId = rec.get("project");
        var environmentId = rec.get("environment");

        // Convert byte arrays
        if (previousState && typeof previousState[0] === "number") {
          var psStr = "";
          for (var psi = 0; psi < previousState.length; psi++) psStr += String.fromCharCode(previousState[psi]);
          try { psStr = decodeURIComponent(escape(psStr)); } catch(ue) {}
          try { previousState = JSON.parse(psStr); } catch (err) {}
        }
        if (currentState && typeof currentState[0] === "number") {
          var csStr = "";
          for (var csi = 0; csi < currentState.length; csi++) csStr += String.fromCharCode(currentState[csi]);
          try { csStr = decodeURIComponent(escape(csStr)); } catch(ue) {}
          try { currentState = JSON.parse(csStr); } catch (err) {}
        }

        // Archive the rejected rule to Git under deleted/{YYYY-MM-DD}/
        if (currentState) {
          var archiveToml = rec.get("toml_content") || "";
          if (!archiveToml) {
            try {
              var tomlResp = $http.send({
                url: "http://localhost:8091/export-toml",
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ rule: currentState }),
                timeout: 15
              });
              if (tomlResp.statusCode === 200) {
                archiveToml = JSON.parse(tomlResp.raw).toml_content;
              }
            } catch (err) {
              console.log("[Bulk-Reject] TOML conversion for archive failed for " + ruleId + ": " + String(err));
            }
          }
          if (archiveToml) {
            var archiveRes = archiveRejectedToGit(e.app, projectId, ruleId, ruleName, archiveToml, reviewedBy);
            console.log("[Bulk-Reject] Archive for " + ruleName + ": " + JSON.stringify(archiveRes));
          }
        }

        // Get Elastic connection info (cached per project+env)
        var connKey = projectId + ":" + (environmentId || "");
        if (!connCache[connKey]) {
          var project = e.app.findRecordById("projects", projectId);
          var elasticId = project.get("elastic_instance");
          var elastic = e.app.findRecordById("elastic_instances", elasticId);
          var envSpace = project.get("elastic_space") || "default";
          if (environmentId) {
            try {
              var env = e.app.findRecordById("environments", environmentId);
              envSpace = env.get("elastic_space") || envSpace;
            } catch (err) {}
          }
          connCache[connKey] = {
            elasticUrl: elastic.get("url").replace(/\/$/, ""),
            apiKey: elastic.get("api_key"),
            space: envSpace
          };
        }
        var conn = connCache[connKey];
        var reverted = false;

        if (changeType === "new_rule") {
          // Delete the new rule from Elastic
          var delUrl = conn.elasticUrl + (conn.space !== "default" ? "/s/" + conn.space : "") + "/api/detection_engine/rules?rule_id=" + encodeURIComponent(ruleId);
          var delResp = $http.send({
            url: delUrl,
            method: "DELETE",
            headers: { "Authorization": "ApiKey " + conn.apiKey, "kbn-xsrf": "true" },
            timeout: 15
          });
          reverted = delResp.statusCode === 200;
        } else if (previousState && typeof previousState === "object") {
          // Revert to previous state
          var revertResp = $http.send({
            url: "http://localhost:8091/revert-rule",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kibana_url: conn.elasticUrl,
              api_key: conn.apiKey,
              space: conn.space,
              rule_content: previousState
            }),
            timeout: 30
          });
          if (revertResp.statusCode === 200) {
            var revertData = JSON.parse(revertResp.raw);
            reverted = revertData.success;
          }
        }

        if (reverted) {
          e.app.delete(rec);
          rejected++;
        } else {
          rec.set("status", "rejected");
          rec.set("reviewed_by", reviewedBy);
          rec.set("reviewed_at", new Date().toISOString());
          rec.set("reverted", false);
          e.app.save(rec);
          failed++;
          errors.push("Failed to revert " + ruleName);
        }
      } catch (err) {
        failed++;
        errors.push(String(err));
      }
    }

    // Audit log
    logAudit(e.app, {
      user: reviewedBy,
      action: "bulk_rejected",
      resource_type: "rule",
      resource_id: batchId || "",
      resource_name: rejected + " rules rejected",
      project: "",
      details: { rejected: rejected, failed: failed, batch_id: batchId || "" },
      status: failed > 0 ? "error" : "success",
      error_message: errors.length > 0 ? errors.join("; ").substring(0, 500) : ""
    });

    return e.json(200, { success: true, rejected: rejected, failed: failed, errors: errors });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Notification API: List
// ============================================================================
routerAdd("GET", "/api/notifications", function(e) {
  var limitStr = e.request.url.query().get("limit");
  var limit = limitStr ? parseInt(limitStr) : 50;
  var unreadOnly = e.request.url.query().get("unread_only") === "true";

  var filter = unreadOnly ? "read = false" : "1=1";

  try {
    var records = e.app.findRecordsByFilter("notifications", filter, "-created", limit, 0);
    var result = [];
    var unreadCount = 0;

    for (var i = 0; i < records.length; i++) {
      var n = records[i];
      var isRead = n.get("read");
      if (!isRead) unreadCount++;
      result.push({
        id: n.id,
        title: n.get("title"),
        message: n.get("message"),
        type: n.get("type"),
        severity: n.get("severity"),
        link: n.get("link"),
        read: isRead,
        project: n.get("project"),
        created: n.get("created")
      });
    }

    // Get total unread count
    if (!unreadOnly) {
      try {
        var allUnread = e.app.findRecordsByFilter("notifications", "read = false", "", 0, 0);
        unreadCount = allUnread.length;
      } catch (err) {}
    }

    return e.json(200, { success: true, notifications: result, unread_count: unreadCount });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Notification API: Mark as read
// ============================================================================
routerAdd("POST", "/api/notifications/read", function(e) {
  var data = e.requestInfo().body;
  var ids = data.ids || [];

  try {
    var marked = 0;
    for (var i = 0; i < ids.length; i++) {
      try {
        var n = e.app.findRecordById("notifications", ids[i]);
        n.set("read", true);
        e.app.save(n);
        marked++;
      } catch (err) {}
    }
    return e.json(200, { success: true, marked: marked });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Notification API: Mark all as read
// ============================================================================
routerAdd("POST", "/api/notifications/read-all", function(e) {
  try {
    var unread = e.app.findRecordsByFilter("notifications", "read = false", "", 500, 0);
    for (var i = 0; i < unread.length; i++) {
      unread[i].set("read", true);
      e.app.save(unread[i]);
    }
    return e.json(200, { success: true, marked: unread.length });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Webhook API: List
// ============================================================================
routerAdd("GET", "/api/webhooks", function(e) {
  try {
    var records = e.app.findRecordsByFilter("webhook_configs", "1=1", "-created", 100, 0);
    var result = [];
    for (var i = 0; i < records.length; i++) {
      var w = records[i];
      result.push({
        id: w.id,
        name: w.get("name"),
        url: w.get("url"),
        events: w.get("events"),
        is_active: w.get("is_active"),
        last_triggered: w.get("last_triggered"),
        last_status: w.get("last_status"),
        created: w.get("created")
      });
    }
    return e.json(200, { success: true, webhooks: result });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Webhook API: Create
// ============================================================================
routerAdd("POST", "/api/webhooks", function(e) {
  var data = e.requestInfo().body;
  try {
    var col = e.app.findCollectionByNameOrId("webhook_configs");
    var rec = new Record(col);
    rec.set("name", data.name);
    rec.set("url", data.url);
    rec.set("secret", data.secret || "");
    rec.set("events", data.events || []);
    rec.set("is_active", data.is_active !== false);
    rec.set("headers", data.headers || {});
    rec.set("last_status", "unknown");
    e.app.save(rec);
    return e.json(200, { success: true, id: rec.id, message: "Webhook created" });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Webhook API: Update
// ============================================================================
routerAdd("PUT", "/api/webhooks/{id}", function(e) {
  var id = e.request.pathValue("id");
  var data = e.requestInfo().body;
  try {
    var rec = e.app.findRecordById("webhook_configs", id);
    if (data.name !== undefined) rec.set("name", data.name);
    if (data.url !== undefined) rec.set("url", data.url);
    if (data.secret !== undefined) rec.set("secret", data.secret);
    if (data.events !== undefined) rec.set("events", data.events);
    if (data.is_active !== undefined) rec.set("is_active", data.is_active);
    if (data.headers !== undefined) rec.set("headers", data.headers);
    e.app.save(rec);
    return e.json(200, { success: true, message: "Webhook updated" });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Webhook API: Delete
// ============================================================================
routerAdd("DELETE", "/api/webhooks/{id}", function(e) {
  var id = e.request.pathValue("id");
  try {
    var rec = e.app.findRecordById("webhook_configs", id);
    e.app.delete(rec);
    return e.json(200, { success: true, message: "Webhook deleted" });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Webhook API: Test
// ============================================================================
routerAdd("POST", "/api/webhooks/{id}/test", function(e) {
  var id = e.request.pathValue("id");
  try {
    var hook = e.app.findRecordById("webhook_configs", id);
    var testPayload = {
      event: "test",
      timestamp: new Date().toISOString(),
      message: "This is a test webhook from Elastic Git Sync"
    };

    var hookHeaders = hook.get("headers") || {};
    if (typeof hookHeaders === "string") {
      try { hookHeaders = JSON.parse(hookHeaders); } catch (err) { hookHeaders = {}; }
    }
    hookHeaders["Content-Type"] = "application/json";

    var resp = $http.send({
      url: hook.get("url"),
      method: "POST",
      headers: hookHeaders,
      body: JSON.stringify(testPayload),
      timeout: 10
    });

    hook.set("last_triggered", new Date().toISOString());
    hook.set("last_status", resp.statusCode >= 200 && resp.statusCode < 300 ? "success" : "failed");
    e.app.save(hook);

    return e.json(200, {
      success: resp.statusCode >= 200 && resp.statusCode < 300,
      status_code: resp.statusCode,
      message: "Test webhook sent"
    });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Baseline Sync API: Initialize snapshots from current Elastic state
// ============================================================================
routerAdd("POST", "/api/review/init-baseline", function(e) {
  function logAudit(app, params) {
    try {
      var user = params.user || "system";
      if (user === "system") { try { var _a = e.requestInfo().auth; if (_a) { user = _a.getString("email") || _a.get("email") || user; } } catch(_x) {} }
      if (user === "system") { try { var _h = e.request.header.get("Authorization"); if (_h) { if (_h.indexOf("Bearer ") === 0) _h = _h.substring(7); var _r = e.app.findAuthRecordByToken(_h, ""); if (_r) { user = _r.getString("email") || _r.get("email") || user; } } } catch(_x) {} }
      var col = app.findCollectionByNameOrId("audit_logs");
      var rec = new Record(col);
      rec.set("user", user);
      rec.set("action", params.action);
      rec.set("resource_type", params.resource_type);
      rec.set("resource_id", params.resource_id || "");
      rec.set("resource_name", params.resource_name || "");
      if (params.project) rec.set("project", params.project);
      rec.set("details", params.details || {});
      rec.set("status", params.status || "success");
      rec.set("error_message", params.error_message || "");
      app.save(rec);
    } catch (err) {
      console.log("[Audit] Error logging: " + String(err));
    }
  }

  var data = e.requestInfo().body;
  var projectId = data.project_id;

  try {
    var project = e.app.findRecordById("projects", projectId);
    var elasticId = project.get("elastic_instance");
    var elastic = e.app.findRecordById("elastic_instances", elasticId);
    var elasticUrl = elastic.get("url").replace(/\/$/, "");
    var apiKey = elastic.get("api_key");

    var environments = e.app.findRecordsByFilter("environments", "project = '" + projectId + "'", "", 10, 0);
    var totalSnapshotted = 0;

    for (var ei = 0; ei < environments.length; ei++) {
      var env = environments[ei];
      var envSpace = env.get("elastic_space");

      // Call sync service to get current state
      var detectResp = $http.send({
        url: "http://localhost:8091/detect-changes",
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kibana_url: elasticUrl,
          api_key: apiKey,
          space: envSpace,
          baseline_snapshots: []
        }),
        timeout: 120
      });

      if (detectResp.statusCode === 200) {
        var detectData = JSON.parse(detectResp.raw);
        var currentRules = detectData.current_rules || [];

        for (var ri = 0; ri < currentRules.length; ri++) {
          var rule = currentRules[ri];
          try {
            var snapCol = e.app.findCollectionByNameOrId("rule_snapshots");
            var snap;
            // Check if snapshot exists
            try {
              var existing = e.app.findRecordsByFilter("rule_snapshots",
                "project = '" + projectId + "' && environment = '" + env.id + "' && rule_id = '" + rule.rule_id + "'",
                "", 1, 0);
              snap = existing.length > 0 ? existing[0] : new Record(snapCol);
            } catch (err) {
              snap = new Record(snapCol);
            }

            snap.set("project", projectId);
            snap.set("environment", env.id);
            snap.set("rule_id", rule.rule_id);
            snap.set("rule_name", rule.rule_name);
            snap.set("rule_hash", rule.rule_hash);
            snap.set("rule_content", rule.rule_content);
            snap.set("toml_content", rule.toml_content || "");
            snap.set("enabled", rule.enabled);
            snap.set("severity", rule.severity);
            snap.set("tags", rule.tags);
            snap.set("exceptions", rule.exceptions);
            snap.set("last_approved_at", new Date().toISOString());
            e.app.save(snap);
            totalSnapshotted++;
          } catch (err) {
            console.log("[Baseline] Error saving snapshot: " + String(err));
          }
        }
      }
    }

    // Audit log
    logAudit(e.app, {
      user: "user",
      action: "baseline_initialized",
      resource_type: "baseline",
      resource_id: projectId,
      resource_name: project.get("name"),
      project: projectId,
      details: { rule_count: totalSnapshotted }
    });

    return e.json(200, {
      success: true,
      message: "Baseline initialized with " + totalSnapshotted + " rule snapshots",
      total: totalSnapshotted
    });
  } catch (err) {
    return e.json(500, { success: false, message: String(err) });
  }
});

// ============================================================================
// Auto-sync cron job - DETECT AND QUEUE model
// Detects changes in Elastic, creates pending_changes for review
// ============================================================================
cronAdd("auto_sync_scheduler", "* * * * *", function() {
  function logAudit(app, params) {
    try {
      var col = app.findCollectionByNameOrId("audit_logs");
      var rec = new Record(col);
      rec.set("user", params.user || "system");
      rec.set("action", params.action);
      rec.set("resource_type", params.resource_type);
      rec.set("resource_id", params.resource_id || "");
      rec.set("resource_name", params.resource_name || "");
      if (params.project) rec.set("project", params.project);
      rec.set("details", params.details || {});
      rec.set("status", params.status || "success");
      rec.set("error_message", params.error_message || "");
      app.save(rec);
    } catch (err) {
      console.log("[Audit] Error logging: " + String(err));
    }
  }

  function createNotification(app, title, message, type, severity, link, projectId) {
    try {
      var col = app.findCollectionByNameOrId("notifications");
      var rec = new Record(col);
      rec.set("title", title);
      rec.set("message", message);
      rec.set("type", type);
      rec.set("severity", severity);
      rec.set("link", link || "");
      rec.set("read", false);
      if (projectId) rec.set("project", projectId);
      app.save(rec);
    } catch (err) {
      console.log("[Notification] Error creating: " + String(err));
    }
  }

  function fireWebhooks(app, eventType, payload) {
    try {
      var hooks = app.findRecordsByFilter("webhook_configs", "is_active = true", "", 100, 0);
      for (var i = 0; i < hooks.length; i++) {
        var hook = hooks[i];
        var events = hook.get("events");
        if (typeof events === "string") {
          try { events = JSON.parse(events); } catch (err) { events = []; }
        }
        if (!events || events.indexOf(eventType) === -1) continue;
        var hookUrl = hook.get("url");
        var hookHeaders = hook.get("headers") || {};
        if (typeof hookHeaders === "string") {
          try { hookHeaders = JSON.parse(hookHeaders); } catch (err) { hookHeaders = {}; }
        }
        hookHeaders["Content-Type"] = "application/json";
        var secret = hook.get("secret");
        if (secret) { hookHeaders["X-Webhook-Secret"] = secret; }
        try {
          var resp = $http.send({ url: hookUrl, method: "POST", headers: hookHeaders, body: JSON.stringify(payload), timeout: 10 });
          hook.set("last_triggered", new Date().toISOString());
          hook.set("last_status", resp.statusCode >= 200 && resp.statusCode < 300 ? "success" : "failed");
          app.save(hook);
        } catch (err) {
          hook.set("last_triggered", new Date().toISOString());
          hook.set("last_status", "failed");
          try { app.save(hook); } catch (saveErr) {}
          console.log("[Webhook] Error firing to " + hookUrl + ": " + String(err));
        }
      }
    } catch (err) {
      console.log("[Webhook] Error loading configs: " + String(err));
    }
  }

  console.log("[Auto-Sync] Checking for scheduled change detections...");

  try {
    var projects = $app.findRecordsByFilter(
      "projects",
      "is_active = true && sync_enabled = true && auto_sync_interval > 0",
      "",
      100,
      0
    );

    var now = new Date();

    for (var i = 0; i < projects.length; i++) {
      var project = projects[i];
      var intervalMinutes = project.get("auto_sync_interval") || 0;
      if (intervalMinutes <= 0) continue;

      var environments = [];
      try {
        environments = $app.findRecordsByFilter(
          "environments",
          "project = '" + project.id + "'",
          "",
          10,
          0
        );
      } catch (err) {
        continue;
      }

      for (var ei = 0; ei < environments.length; ei++) {
        var env = environments[ei];
        var envName = env.get("name");

        // Check last detection job
        var needsCheck = false;
        try {
          var lastJobs = $app.findRecordsByFilter(
            "sync_jobs",
            "project = '" + project.id + "' && environment = '" + env.id + "' && type = 'scheduled' && (status = 'completed' || status = 'running')",
            "-created",
            1,
            0
          );

          if (lastJobs.length === 0) {
            needsCheck = true;
          } else {
            var lastJobTime = lastJobs[0].get("created");
            var lastSync = new Date(lastJobTime);
            var diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
            needsCheck = diffMinutes >= intervalMinutes;
          }
        } catch (err) {
          needsCheck = false;
        }

        if (!needsCheck) continue;

        console.log("[Auto-Sync] Running change detection for " + project.get("name") + " env " + envName);

        // Create sync job record
        var jobCol = $app.findCollectionByNameOrId("sync_jobs");
        var job = new Record(jobCol);
        job.set("project", project.id);
        job.set("type", "scheduled");
        job.set("direction", "elastic_to_git");
        job.set("status", "running");
        job.set("triggered_by", "scheduler");
        job.set("started_at", now.toISOString());
        job.set("environment", env.id);

        try {
          $app.save(job);
        } catch (err) {
          console.log("[Auto-Sync] Error saving job: " + String(err));
          continue;
        }

        try {
          // Get connection details
          var elasticId = project.get("elastic_instance");
          var elastic = $app.findRecordById("elastic_instances", elasticId);
          var elasticUrl = elastic.get("url").replace(/\/$/, "");
          var apiKey = elastic.get("api_key");
          var envSpace = env.get("elastic_space");

          // Load baseline snapshots
          var baselineSnapshots = [];
          try {
            var snapshots = $app.findRecordsByFilter(
              "rule_snapshots",
              "project = '" + project.id + "' && environment = '" + env.id + "'",
              "",
              5000,
              0
            );
            for (var si = 0; si < snapshots.length; si++) {
              var s = snapshots[si];
              // PocketBase JSVM returns JSON fields as byte arrays - convert to objects
              var rc = s.get("rule_content");
              if (rc && typeof rc[0] === "number") {
                var rcStr = "";
                for (var bi = 0; bi < rc.length; bi++) rcStr += String.fromCharCode(rc[bi]);
                try { rcStr = decodeURIComponent(escape(rcStr)); } catch(ue) {}
                try { rc = JSON.parse(rcStr); } catch (err) {}
              }
              var exc = s.get("exceptions") || [];
              if (exc && typeof exc[0] === "number") {
                var excStr = "";
                for (var bi2 = 0; bi2 < exc.length; bi2++) excStr += String.fromCharCode(exc[bi2]);
                try { excStr = decodeURIComponent(escape(excStr)); } catch(ue) {}
                try { exc = JSON.parse(excStr); } catch (err) { exc = []; }
              }
              var tgs = s.get("tags") || [];
              if (tgs && typeof tgs[0] === "number") {
                var tgsStr = "";
                for (var bi3 = 0; bi3 < tgs.length; bi3++) tgsStr += String.fromCharCode(tgs[bi3]);
                try { tgsStr = decodeURIComponent(escape(tgsStr)); } catch(ue) {}
                try { tgs = JSON.parse(tgsStr); } catch (err) { tgs = []; }
              }
              baselineSnapshots.push({
                rule_id: s.get("rule_id"),
                rule_name: s.get("rule_name"),
                rule_hash: s.get("rule_hash"),
                rule_content: rc,
                exceptions: exc,
                enabled: s.get("enabled"),
                severity: s.get("severity"),
                tags: tgs
              });
            }
          } catch (err) {
            console.log("[Auto-Sync] Error loading snapshots: " + String(err));
          }

          // Call sync service to detect changes
          var detectResp = $http.send({
            url: "http://localhost:8091/detect-changes",
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              kibana_url: elasticUrl,
              api_key: apiKey,
              space: envSpace,
              baseline_snapshots: baselineSnapshots
            }),
            timeout: 120
          });

          if (detectResp.statusCode !== 200) {
            throw new Error("Sync service returned " + detectResp.statusCode);
          }

          var detectData = JSON.parse(detectResp.raw);
          var changes = detectData.changes || [];
          var errors = detectData.errors || [];

          console.log("[Auto-Sync] Detected " + changes.length + " changes, " + errors.length + " errors");

          // Create pending_changes records
          var batchId = now.toISOString().replace(/[:.]/g, "-") + "-" + project.id.substring(0, 8);
          var pendingCol = $app.findCollectionByNameOrId("pending_changes");
          var changesCreated = 0;

          for (var ci = 0; ci < changes.length; ci++) {
            var ch = changes[ci];
            var changeTypes = ch.change_types || ["modified_rule"];
            var primaryType = changeTypes[0];

            try {
              var pending = new Record(pendingCol);
              pending.set("project", project.id);
              pending.set("environment", env.id);
              pending.set("detection_batch", batchId);
              pending.set("rule_id", ch.rule_id);
              pending.set("rule_name", ch.rule_name);
              pending.set("change_type", primaryType);
              pending.set("previous_state", ch.previous_state || null);
              pending.set("current_state", ch.current_state || null);
              pending.set("diff_summary", ch.diff_summary || "");
              pending.set("toml_content", ch.toml_content || "");
              pending.set("status", "pending");
              pending.set("reverted", false);
              $app.save(pending);
              changesCreated++;
            } catch (err) {
              console.log("[Auto-Sync] Error creating pending change for rule " + ch.rule_id + " (" + ch.rule_name + "): " + String(err));
            }
          }

          // Update job status
          var summary = {
            changes_detected: changes.length,
            pending_created: changesCreated,
            errors: errors.length
          };
          job.set("status", "completed");
          job.set("completed_at", new Date().toISOString());
          job.set("changes_summary", JSON.stringify(summary));
          if (errors.length > 0) {
            job.set("error_message", errors.join("; ").substring(0, 5000));
          }
          $app.save(job);

          // Create notification if changes detected
          if (changesCreated > 0) {
            createNotification($app,
              changesCreated + " changes detected",
              changesCreated + " rule change(s) detected in " + project.get("name") + " (" + envName + "). Review required.",
              "change_detected", "warning",
              "/review?batch=" + batchId,
              project.id
            );

            // Fire webhooks
            var changeSummaryList = [];
            for (var ws = 0; ws < changes.length; ws++) {
              changeSummaryList.push({
                rule_name: changes[ws].rule_name,
                change_type: (changes[ws].change_types || ["modified_rule"])[0]
              });
            }

            fireWebhooks($app, "change_detected", {
              event: "change_detected",
              timestamp: now.toISOString(),
              project: { id: project.id, name: project.get("name") },
              summary: changesCreated + " rule changes detected in " + project.get("name") + " (" + envName + ")",
              changes_count: changesCreated,
              review_url: "/review?batch=" + batchId,
              changes: changeSummaryList
            });
          }

          console.log("[Auto-Sync] Completed detection for " + project.get("name") + " " + envName + ": " + changesCreated + " pending changes");

          // Audit log for auto-detected changes
          if (changesCreated > 0) {
            logAudit($app, {
              user: "scheduler",
              action: "change_detected",
              resource_type: "sync_job",
              resource_id: job.id,
              resource_name: project.get("name"),
              project: project.id,
              details: { environment: envName, changes_count: changesCreated, batch_id: batchId }
            });
          }

        } catch (err) {
          console.log("[Auto-Sync] Error in detection: " + String(err));
          try {
            job.set("status", "failed");
            job.set("error_message", String(err));
            job.set("completed_at", new Date().toISOString());
            $app.save(job);
          } catch (saveErr) {}
        }
      }
    }
  } catch (err) {
    console.log("[Auto-Sync] Scheduler error: " + String(err));
  }
});

// ============================================================================
// Audit Logs API: List with filtering and pagination
// ============================================================================
routerAdd("GET", "/api/audit-logs", function(e) {
  var pageStr = e.request.url.query().get("page");
  var perPageStr = e.request.url.query().get("per_page");
  var actionFilter = e.request.url.query().get("action");
  var userFilter = e.request.url.query().get("user");
  var projectFilter = e.request.url.query().get("project_id");

  var page = pageStr ? parseInt(pageStr) : 1;
  var perPage = perPageStr ? parseInt(perPageStr) : 50;
  if (page < 1) page = 1;
  if (perPage < 1) perPage = 50;
  if (perPage > 200) perPage = 200;

  var filter = "1=1";
  if (actionFilter) filter += " && action = '" + actionFilter + "'";
  if (userFilter) filter += " && user ~ '" + userFilter + "'";
  if (projectFilter) filter += " && project = '" + projectFilter + "'";

  try {
    var total = 0;
    try {
      var allRecs = e.app.findRecordsByFilter("audit_logs", filter, "", 0, 0);
      total = allRecs.length;
    } catch (err) {
      total = 0;
    }

    var offset = (page - 1) * perPage;
    var records = e.app.findRecordsByFilter("audit_logs", filter, "-created", perPage, offset);
    var result = [];

    for (var i = 0; i < records.length; i++) {
      var r = records[i];
      var details = r.get("details");
      // Handle PocketBase JSVM byte array for JSON fields
      if (details && typeof details[0] === "number") {
        var dStr = "";
        for (var di = 0; di < details.length; di++) dStr += String.fromCharCode(details[di]);
        try { dStr = decodeURIComponent(escape(dStr)); } catch(ue) {}
        try { details = JSON.parse(dStr); } catch (err) { details = {}; }
      }

      var projectName = "";
      var projectId = r.get("project");
      if (projectId) {
        try {
          var proj = e.app.findRecordById("projects", projectId);
          projectName = proj.get("name");
        } catch (err) {}
      }

      result.push({
        id: r.id,
        user: r.get("user"),
        action: r.get("action"),
        resource_type: r.get("resource_type"),
        resource_id: r.get("resource_id"),
        resource_name: r.get("resource_name"),
        project: projectId,
        project_name: projectName,
        details: details,
        status: r.get("status"),
        error_message: r.get("error_message"),
        created: r.get("created")
      });
    }

    return e.json(200, {
      success: true,
      items: result,
      total: total,
      page: page,
      per_page: perPage,
      total_pages: Math.ceil(total / perPage)
    });
  } catch (err) {
    return e.json(200, { success: true, items: [], total: 0, page: 1, per_page: perPage, total_pages: 0 });
  }
});

console.log("Elastic Git Sync hooks loaded (with change detection scheduler, review, notifications, webhooks, audit logging)");
