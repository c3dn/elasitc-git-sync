/// <reference path="../pb_data/types.d.ts" />

/**
 * Elastic Git Sync - PocketBase Hooks
 * Compatible with PocketBase v0.23+
 */

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
  var totalTestRules = 0;
  var totalProdRules = 0;

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

  try {
    var recentSyncs = e.app.findRecordsByFilter("sync_jobs", "1=1", "-created", 10, 0);
    for (var i = 0; i < recentSyncs.length; i++) {
      var sync = recentSyncs[i];
      var changesSummary = sync.get("changes_summary");
      if (changesSummary && typeof changesSummary === "string") {
        try { changesSummary = JSON.parse(changesSummary); } catch (err) { changesSummary = null; }
      }
      syncList.push({
        id: sync.id,
        project: sync.get("project"),
        type: sync.get("type"),
        direction: sync.get("direction"),
        status: sync.get("status"),
        started_at: sync.get("started_at"),
        completed_at: sync.get("completed_at"),
        changes_summary: changesSummary ? {
          added: changesSummary.exported || changesSummary.imported || 0,
          modified: 0,
          deleted: changesSummary.deleted || 0
        } : null,
        created: sync.get("created")
      });
    }
  } catch (err) {}

  // Count total rules across all environments
  for (var p = 0; p < projects.length; p++) {
    var project = projects[p];
    try {
      var elasticId = project.get("elastic_instance");
      var elastic = e.app.findRecordById("elastic_instances", elasticId);
      var elasticUrl = elastic.get("url").replace(/\/$/, "");
      var apiKey = elastic.get("api_key");

      var envs = e.app.findRecordsByFilter("environments", "project = '" + project.id + "'", "", 10, 0);
      for (var ev = 0; ev < envs.length; ev++) {
        var env = envs[ev];
        var envSpace = env.get("elastic_space");
        var envName = env.get("name");
        var rulesApiUrl = elasticUrl + (envSpace && envSpace !== "default" ? "/s/" + envSpace : "") + "/api/detection_engine/rules/_find?per_page=1";

        try {
          var resp = $http.send({
            url: rulesApiUrl,
            method: "GET",
            headers: { "Authorization": "ApiKey " + apiKey, "kbn-xsrf": "true" },
            timeout: 10
          });
          if (resp.statusCode === 200) {
            var data = JSON.parse(resp.raw);
            var count = data.total || 0;
            if (envName === "test") totalTestRules += count;
            else if (envName === "production") totalProdRules += count;
            totalRules += count;
          }
        } catch (err) {}
      }
    } catch (err) {}
  }

  return e.json(200, {
    total_projects: totalProjects,
    active_syncs: activeSyncs,
    pending_conflicts: pendingConflicts,
    recent_syncs: syncList,
    sync_success_rate: syncSuccessRate,
    total_rules: totalRules,
    total_test_rules: totalTestRules,
    total_prod_rules: totalProdRules
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

    var rulesApiUrl = elasticUrl + (elasticSpace && elasticSpace !== "default" ? "/s/" + elasticSpace : "") + "/api/detection_engine/rules/_find?per_page=100";

    var resp = $http.send({
      url: rulesApiUrl,
      method: "GET",
      headers: {
        "Authorization": "ApiKey " + apiKey,
        "kbn-xsrf": "true",
        "Content-Type": "application/json"
      },
      timeout: 30
    });

    if (resp.statusCode === 200) {
      var responseData = JSON.parse(resp.raw);
      var allRules = responseData.data || [];
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
        total: responseData.total || allRules.length
      });
    } else {
      return e.json(200, {
        success: false,
        message: "Elastic API returned status " + resp.statusCode,
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
  var data = e.requestInfo().body;
  var projectId = data.project_id;
  var direction = data.direction || "elastic_to_git";
  // Accept branch and space overrides from environment
  var branchOverride = data.branch;
  var spaceOverride = data.space;
  var environmentId = data.environment_id;
  var selectedRuleIds = data.rule_ids; // optional array of rule_id strings for selective export

  try {
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

    var summary = { exported: 0, imported: 0 };

    // Export: Elastic -> Git
    if (direction === "elastic_to_git" || direction === "bidirectional") {
      // Fetch rules from Elastic
      var elasticRules = [];
      var elasticApiUrl = elasticUrl + (elasticSpace && elasticSpace !== "default" ? "/s/" + elasticSpace : "") + "/api/detection_engine/rules/_find?per_page=100";

      console.log("Fetching rules from: " + elasticApiUrl);

      try {
        var elasticResp = $http.send({
          url: elasticApiUrl,
          method: "GET",
          headers: {
            "Authorization": "ApiKey " + apiKey,
            "kbn-xsrf": "true",
            "Content-Type": "application/json"
          },
          timeout: 30
        });

        console.log("Elastic API response status: " + elasticResp.statusCode);

        if (elasticResp.statusCode === 200) {
          var elasticData = JSON.parse(elasticResp.raw);
          elasticRules = elasticData.data || [];
          console.log("Found " + elasticRules.length + " rules in Elastic");
        } else {
          console.log("Elastic API error: " + elasticResp.raw);
        }
      } catch (err) {
        console.log("Error fetching Elastic rules: " + String(err));
      }

      // Filter rules if specific rule_ids were provided (selective export)
      if (selectedRuleIds && selectedRuleIds.length > 0) {
        var filteredRules = [];
        for (var fi = 0; fi < elasticRules.length; fi++) {
          var ruleIdentifier = elasticRules[fi].rule_id || elasticRules[fi].id;
          for (var si = 0; si < selectedRuleIds.length; si++) {
            if (selectedRuleIds[si] === ruleIdentifier) {
              filteredRules.push(elasticRules[fi]);
              break;
            }
          }
        }
        elasticRules = filteredRules;
        console.log("Filtered to " + elasticRules.length + " selected rules");
      }

      // Export to Git
      console.log("Exporting " + elasticRules.length + " rules to " + gitProvider);

      // Build map of current Elastic rule IDs
      var elasticRuleIds = {};
      for (var r = 0; r < elasticRules.length; r++) {
        elasticRuleIds[elasticRules[r].rule_id || elasticRules[r].id] = true;
      }

      if (gitProvider === "gitlab") {
        var glExportMatch = gitRepoUrl.match(/^(https?:\/\/[^\/]+)\/(.+)$/);
        console.log("GitLab URL parse: " + (glExportMatch ? "OK" : "failed"));
        if (glExportMatch) {
          var glApiBase = glExportMatch[1] + "/api/v4";
          var glProjectPath = encodeURIComponent(glExportMatch[2]);

          // Check if the branch exists, create it if not
          var branchCheckUrl = glApiBase + "/projects/" + glProjectPath + "/repository/branches/" + encodeURIComponent(gitBranch);
          try {
            var branchResp = $http.send({
              url: branchCheckUrl,
              method: "GET",
              headers: { "Authorization": "Bearer " + gitToken },
              timeout: 10
            });
            if (branchResp.statusCode === 404) {
              // Branch doesn't exist, create it from default branch
              console.log("Branch '" + gitBranch + "' doesn't exist, creating it...");
              var defaultBranch = gitRepo.get("default_branch") || "main";
              var createBranchUrl = glApiBase + "/projects/" + glProjectPath + "/repository/branches";
              var createResp = $http.send({
                url: createBranchUrl,
                method: "POST",
                headers: {
                  "Authorization": "Bearer " + gitToken,
                  "Content-Type": "application/json"
                },
                body: JSON.stringify({
                  branch: gitBranch,
                  ref: defaultBranch
                }),
                timeout: 15
              });
              if (createResp.statusCode === 201) {
                console.log("Created branch: " + gitBranch);
              } else {
                console.log("Failed to create branch: " + createResp.raw);
              }
            } else {
              console.log("Branch '" + gitBranch + "' exists");
            }
          } catch (err) {
            console.log("Error checking branch: " + String(err));
          }

          // First, get existing files in Git to detect deletions
          var existingFiles = [];
          var treePath = gitPath ? encodeURIComponent(gitPath) : "";
          var treeUrl = glApiBase + "/projects/" + glProjectPath + "/repository/tree?ref=" + gitBranch + "&path=" + treePath + "&per_page=100";

          try {
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
                  existingFiles.push(files[f]);
                }
              }
            }
          } catch (err) {
            console.log("Error getting existing files: " + String(err));
          }

          // Export/Update rules - use rule_id as filename (stable identifier)
          for (var i = 0; i < elasticRules.length; i++) {
            var rule = elasticRules[i];
            // Use rule_id for filename (stable, doesn't change on rename)
            var ruleId = rule.rule_id || rule.id;
            var fileName = ruleId + ".json";
            var filePath = gitPath ? gitPath + "/" + fileName : fileName;
            var content = JSON.stringify(rule, null, 2);
            var glApiUrl = glApiBase + "/projects/" + glProjectPath + "/repository/files/" + encodeURIComponent(filePath);

            // Try update (PUT) first, then create (POST)
            var success = false;
            var methods = ["PUT", "POST"];
            for (var m = 0; m < methods.length && !success; m++) {
              try {
                console.log("GitLab " + methods[m] + ": " + fileName + " (" + rule.name + ")");
                var glResp = $http.send({
                  url: glApiUrl,
                  method: methods[m],
                  headers: {
                    "Authorization": "Bearer " + gitToken,
                    "Content-Type": "application/json"
                  },
                  body: JSON.stringify({
                    branch: gitBranch,
                    content: content,
                    commit_message: (methods[m] === "POST" ? "Add" : "Update") + " rule: " + rule.name
                  }),
                  timeout: 15
                });
                if (glResp.statusCode === 200 || glResp.statusCode === 201) {
                  summary.exported++;
                  success = true;
                } else {
                  console.log("GitLab error: " + glResp.raw);
                }
              } catch (err) {
                console.log("GitLab exception: " + String(err));
              }
            }
          }

          // Delete files that no longer exist in Elastic (only on full export, not selective)
          if (!selectedRuleIds || selectedRuleIds.length === 0) {
            summary.deleted = 0;
            for (var d = 0; d < existingFiles.length; d++) {
              var existingFile = existingFiles[d];
              // Extract rule_id from filename (remove .json)
              var fileRuleId = existingFile.name.replace(".json", "");

              if (!elasticRuleIds[fileRuleId]) {
                // Rule no longer exists in Elastic, delete from Git
                var deleteUrl = glApiBase + "/projects/" + glProjectPath + "/repository/files/" + encodeURIComponent(existingFile.path);
                try {
                  console.log("Deleting removed rule: " + existingFile.name);
                  var delResp = $http.send({
                    url: deleteUrl,
                    method: "DELETE",
                    headers: {
                      "Authorization": "Bearer " + gitToken,
                      "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                      branch: gitBranch,
                      commit_message: "Delete rule: " + fileRuleId
                    }),
                    timeout: 15
                  });
                  if (delResp.statusCode === 204 || delResp.statusCode === 200) {
                    summary.deleted++;
                    console.log("Deleted: " + existingFile.name);
                  }
                } catch (err) {
                  console.log("Delete error: " + String(err));
                }
              }
            }
          }
        }
      } else if (gitProvider === "github") {
        var ghMatch = gitRepoUrl.match(/github\.com\/(.+?)\/(.+?)$/);
        if (ghMatch) {
          var ghOwner = ghMatch[1];
          var ghRepoName = ghMatch[2];

          // Check if branch exists, create it if not
          var ghBranchCheckUrl = "https://api.github.com/repos/" + ghOwner + "/" + ghRepoName + "/branches/" + gitBranch;
          try {
            var ghBranchResp = $http.send({
              url: ghBranchCheckUrl,
              method: "GET",
              headers: { "Authorization": "token " + gitToken, "Accept": "application/vnd.github.v3+json" },
              timeout: 10
            });
            if (ghBranchResp.statusCode === 404) {
              // Branch doesn't exist, create it from default branch
              console.log("Branch '" + gitBranch + "' doesn't exist on GitHub, creating it...");
              var ghDefaultBranch = gitRepo.get("default_branch") || "main";
              // First get the SHA of the default branch
              var ghRefUrl = "https://api.github.com/repos/" + ghOwner + "/" + ghRepoName + "/git/refs/heads/" + ghDefaultBranch;
              var ghRefResp = $http.send({
                url: ghRefUrl,
                method: "GET",
                headers: { "Authorization": "token " + gitToken, "Accept": "application/vnd.github.v3+json" },
                timeout: 10
              });
              if (ghRefResp.statusCode === 200) {
                var refData = JSON.parse(ghRefResp.raw);
                var ghCreateBranchUrl = "https://api.github.com/repos/" + ghOwner + "/" + ghRepoName + "/git/refs";
                var ghCreateResp = $http.send({
                  url: ghCreateBranchUrl,
                  method: "POST",
                  headers: { "Authorization": "token " + gitToken, "Accept": "application/vnd.github.v3+json" },
                  body: JSON.stringify({
                    ref: "refs/heads/" + gitBranch,
                    sha: refData.object.sha
                  }),
                  timeout: 15
                });
                if (ghCreateResp.statusCode === 201) {
                  console.log("Created branch: " + gitBranch);
                } else {
                  console.log("Failed to create branch: " + ghCreateResp.raw);
                }
              }
            } else {
              console.log("Branch '" + gitBranch + "' exists on GitHub");
            }
          } catch (err) {
            console.log("Error checking GitHub branch: " + String(err));
          }

          for (var j = 0; j < elasticRules.length; j++) {
            var ghRule = elasticRules[j];
            var ghFileName = (ghRule.rule_id || ghRule.id) + ".json";
            var ghFilePath = gitPath ? gitPath + "/" + ghFileName : ghFileName;
            var ghContent = JSON.stringify(ghRule, null, 2);
            var ghApiUrl = "https://api.github.com/repos/" + ghOwner + "/" + ghRepoName + "/contents/" + ghFilePath;

            // Get SHA if file exists
            var sha = "";
            try {
              var getResp = $http.send({
                url: ghApiUrl + "?ref=" + gitBranch,
                method: "GET",
                headers: { "Authorization": "token " + gitToken, "Accept": "application/vnd.github.v3+json" },
                timeout: 10
              });
              if (getResp.statusCode === 200) {
                sha = JSON.parse(getResp.raw).sha;
              }
            } catch (err) {}

            try {
              var ghBody = {
                message: "Sync rule: " + (ghRule.name || ghFileName),
                content: $security.base64Encode(ghContent),
                branch: gitBranch
              };
              if (sha) ghBody.sha = sha;

              var ghPutResp = $http.send({
                url: ghApiUrl,
                method: "PUT",
                headers: { "Authorization": "token " + gitToken, "Accept": "application/vnd.github.v3+json" },
                body: JSON.stringify(ghBody),
                timeout: 15
              });
              if (ghPutResp.statusCode === 200 || ghPutResp.statusCode === 201) {
                summary.exported++;
              }
            } catch (err) {}
          }
        }
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
          var treeUrl = glImportApi + "/projects/" + glProjPath + "/repository/tree?ref=" + gitBranch + "&path=" + treePath + "&per_page=100";

          try {
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
            }
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
      var findApiUrl = elasticUrl + (elasticSpace && elasticSpace !== "default" ? "/s/" + elasticSpace : "") + "/api/detection_engine/rules/_find?per_page=100";

      try {
        var findResp = $http.send({
          url: findApiUrl,
          method: "GET",
          headers: {
            "Authorization": "ApiKey " + apiKey,
            "kbn-xsrf": "true"
          },
          timeout: 30
        });

        if (findResp.statusCode === 200) {
          var findData = JSON.parse(findResp.raw);
          var elasticRulesForDelete = findData.data || [];
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

    var msg = "Sync completed: " + summary.exported + " exported";
    if (summary.deleted) msg += ", " + summary.deleted + " deleted";
    if (summary.imported) msg += ", " + summary.imported + " imported";

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

// Auto-sync cron job - runs every minute to check for scheduled syncs
cronAdd("auto_sync_scheduler", "* * * * *", function() {
  console.log("[Auto-Sync] Checking for scheduled syncs...");

  try {
    // Find all active projects with auto_sync enabled
    var projects = $app.findRecordsByFilter(
      "projects",
      "is_active = true && sync_enabled = true && auto_sync_interval > 0",
      "",
      100,
      0
    );

    console.log("[Auto-Sync] Found " + projects.length + " projects with auto-sync enabled");

    var now = new Date();

    for (var i = 0; i < projects.length; i++) {
      var project = projects[i];
      var intervalMinutes = project.get("auto_sync_interval") || 0;

      if (intervalMinutes <= 0) continue;

      // Find environments for this project
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
        console.log("[Auto-Sync] Error finding environments for project " + project.id + ": " + String(err));
        continue;
      }

      for (var e = 0; e < environments.length; e++) {
        var env = environments[e];
        var envName = env.get("name");
        var lastSyncField = envName === "production" ? "last_sync_prod" : "last_sync_test";
        var lastSyncStr = project.get(lastSyncField);

        var needsSync = false;

        if (!lastSyncStr) {
          // Never synced before
          needsSync = true;
        } else {
          var lastSync = new Date(lastSyncStr);
          var diffMinutes = (now.getTime() - lastSync.getTime()) / (1000 * 60);
          needsSync = diffMinutes >= intervalMinutes;
        }

        if (needsSync) {
          console.log("[Auto-Sync] Triggering sync for project " + project.get("name") + " env " + envName);

          try {
            // Create sync job record
            var collection = $app.findCollectionByNameOrId("sync_jobs");
            var job = new Record(collection);

            job.set("project", project.id);
            job.set("type", "scheduled");
            job.set("direction", "elastic_to_git");
            job.set("status", "running");
            job.set("triggered_by", "scheduler");
            job.set("started_at", now.toISOString());
            job.set("environment", env.id);
            $app.save(job);

            // Get project details
            var elasticId = project.get("elastic_instance");
            var gitRepoId = project.get("git_repository");
            var elasticSpace = env.get("elastic_space");
            var gitBranch = env.get("git_branch");
            var gitPath = project.get("git_path") || "";

            // Get elastic instance
            var elastic = $app.findRecordById("elastic_instances", elasticId);
            var elasticUrl = elastic.get("url").replace(/\/$/, "");
            var apiKey = elastic.get("api_key");

            // Get git repository
            var gitRepo = $app.findRecordById("git_repositories", gitRepoId);
            var gitProvider = gitRepo.get("provider");
            var gitToken = gitRepo.get("access_token");
            var gitRepoUrl = gitRepo.get("url").replace(/\.git$/, "");

            var summary = { exported: 0 };

            // Fetch rules from Elastic
            var elasticRules = [];
            var elasticApiUrl = elasticUrl + (elasticSpace && elasticSpace !== "default" ? "/s/" + elasticSpace : "") + "/api/detection_engine/rules/_find?per_page=100";

            try {
              var elasticResp = $http.send({
                url: elasticApiUrl,
                method: "GET",
                headers: {
                  "Authorization": "ApiKey " + apiKey,
                  "kbn-xsrf": "true",
                  "Content-Type": "application/json"
                },
                timeout: 30
              });

              if (elasticResp.statusCode === 200) {
                var elasticData = JSON.parse(elasticResp.raw);
                elasticRules = elasticData.data || [];
              }
            } catch (err) {
              console.log("[Auto-Sync] Error fetching Elastic rules: " + String(err));
            }

            // Export to Git (GitLab)
            if (gitProvider === "gitlab" && elasticRules.length > 0) {
              var glAutoMatch = gitRepoUrl.match(/^(https?:\/\/[^\/]+)\/(.+)$/);
              if (glAutoMatch) {
                var glAutoApi = glAutoMatch[1] + "/api/v4";
                var glAutoProject = encodeURIComponent(glAutoMatch[2]);

                // Commit each rule
                for (var r = 0; r < elasticRules.length; r++) {
                  var rule = elasticRules[r];
                  var ruleId = rule.rule_id || rule.id;
                  var fileName = ruleId.replace(/[^a-zA-Z0-9_-]/g, "_") + ".json";
                  var filePath = gitPath ? gitPath + "/" + fileName : fileName;

                  var ruleContent = JSON.stringify(rule, null, 2);
                  var encodedContent = encodeURIComponent(ruleContent).replace(/%([0-9A-F]{2})/g, function(match, p1) {
                    return String.fromCharCode('0x' + p1);
                  });
                  var base64Content = btoa(encodedContent);

                  // Check if file exists
                  var fileUrl = glAutoApi + "/projects/" + glAutoProject + "/repository/files/" + encodeURIComponent(filePath) + "?ref=" + encodeURIComponent(gitBranch);
                  var fileExists = false;
                  try {
                    var fileResp = $http.send({
                      url: fileUrl,
                      method: "GET",
                      headers: { "PRIVATE-TOKEN": gitToken },
                      timeout: 10
                    });
                    fileExists = fileResp.statusCode === 200;
                  } catch (err) {}

                  // Create or update file
                  var commitUrl = glAutoApi + "/projects/" + glAutoProject + "/repository/files/" + encodeURIComponent(filePath);
                  try {
                    var commitResp = $http.send({
                      url: commitUrl,
                      method: fileExists ? "PUT" : "POST",
                      headers: {
                        "PRIVATE-TOKEN": gitToken,
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify({
                        branch: gitBranch,
                        content: base64Content,
                        encoding: "base64",
                        commit_message: "[Auto-Sync] " + (fileExists ? "Update" : "Add") + " rule: " + (rule.name || ruleId)
                      }),
                      timeout: 15
                    });

                    if (commitResp.statusCode === 200 || commitResp.statusCode === 201) {
                      summary.exported++;
                    }
                  } catch (err) {
                    console.log("[Auto-Sync] Error committing rule: " + String(err));
                  }
                }
              }
            }

            // Export to Git (GitHub)
            if (gitProvider === "github" && elasticRules.length > 0) {
              var ghMatch = gitRepoUrl.match(/github\.com\/(.+?)$/);
              if (ghMatch) {
                var ghRepoPath = ghMatch[1];

                for (var r = 0; r < elasticRules.length; r++) {
                  var rule = elasticRules[r];
                  var ruleId = rule.rule_id || rule.id;
                  var fileName = ruleId.replace(/[^a-zA-Z0-9_-]/g, "_") + ".json";
                  var filePath = gitPath ? gitPath + "/" + fileName : fileName;

                  var ruleContent = JSON.stringify(rule, null, 2);
                  var base64Content = btoa(unescape(encodeURIComponent(ruleContent)));

                  // Check if file exists
                  var fileUrl = "https://api.github.com/repos/" + ghRepoPath + "/contents/" + filePath + "?ref=" + encodeURIComponent(gitBranch);
                  var fileSha = null;
                  try {
                    var fileResp = $http.send({
                      url: fileUrl,
                      method: "GET",
                      headers: {
                        "Authorization": "Bearer " + gitToken,
                        "Accept": "application/vnd.github.v3+json"
                      },
                      timeout: 10
                    });
                    if (fileResp.statusCode === 200) {
                      var fileData = JSON.parse(fileResp.raw);
                      fileSha = fileData.sha;
                    }
                  } catch (err) {}

                  // Create or update file
                  var commitUrl = "https://api.github.com/repos/" + ghRepoPath + "/contents/" + filePath;
                  var commitBody = {
                    message: "[Auto-Sync] " + (fileSha ? "Update" : "Add") + " rule: " + (rule.name || ruleId),
                    content: base64Content,
                    branch: gitBranch
                  };
                  if (fileSha) commitBody.sha = fileSha;

                  try {
                    var commitResp = $http.send({
                      url: commitUrl,
                      method: "PUT",
                      headers: {
                        "Authorization": "Bearer " + gitToken,
                        "Accept": "application/vnd.github.v3+json",
                        "Content-Type": "application/json"
                      },
                      body: JSON.stringify(commitBody),
                      timeout: 15
                    });

                    if (commitResp.statusCode === 200 || commitResp.statusCode === 201) {
                      summary.exported++;
                    }
                  } catch (err) {
                    console.log("[Auto-Sync] Error committing rule: " + String(err));
                  }
                }
              }
            }

            // Update job status
            job.set("status", "completed");
            job.set("completed_at", new Date().toISOString());
            job.set("changes_summary", JSON.stringify(summary));
            $app.save(job);

            // Update project's last sync timestamp
            project.set(lastSyncField, new Date().toISOString());
            $app.save(project);

            console.log("[Auto-Sync] Completed sync for " + project.get("name") + " " + envName + ": " + summary.exported + " rules exported");

          } catch (err) {
            console.log("[Auto-Sync] Error running sync: " + String(err));
            // Update job to failed status if it exists
            try {
              if (job && job.id) {
                job.set("status", "failed");
                job.set("error_message", String(err));
                job.set("completed_at", new Date().toISOString());
                $app.save(job);
              }
            } catch (saveErr) {}
          }
        }
      }
    }
  } catch (err) {
    console.log("[Auto-Sync] Error in scheduler: " + String(err));
  }
});

console.log("Elastic Git Sync hooks loaded (with auto-sync scheduler)");
