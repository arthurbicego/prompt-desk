import fs from "node:fs";
import { McpRepository } from "../../db/repositories/mcpRepository.js";
import { parseMcpConfigFile } from "../mcp/configParser.js";

export interface McpConfigSyncResult {
  configItemId: string;
  absolutePath: string;
  serverCount: number;
}

export class McpConfigService {
  constructor(private readonly mcpRepository = new McpRepository()) {}

  syncConfigItem(configItemId: string, absolutePath: string): McpConfigSyncResult {
    if (!fs.existsSync(absolutePath)) {
      this.mcpRepository.replaceServersForConfigItem(configItemId, []);
      return { configItemId, absolutePath, serverCount: 0 };
    }

    const parsed = parseMcpConfigFile(configItemId, absolutePath);
    this.mcpRepository.replaceServersForConfigItem(configItemId, parsed.servers);
    return {
      configItemId,
      absolutePath,
      serverCount: parsed.servers.length
    };
  }

  syncKnownConfigItems(): McpConfigSyncResult[] {
    const results: McpConfigSyncResult[] = [];
    for (const item of this.mcpRepository.listConfigItems()) {
      results.push(this.syncConfigItem(item.id, item.absolute_path));
    }
    return results;
  }
}
