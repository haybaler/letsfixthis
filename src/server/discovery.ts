import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ServerInfo {
  port: number;
  host: string;
  pid: number;
  startTime: number;
}

export class ServiceDiscovery {
  private static CONFIG_DIR = path.join(os.homedir(), '.letsfixthis');
  private static SERVER_INFO_FILE = path.join(ServiceDiscovery.CONFIG_DIR, 'server.json');
  
  // Write server info when server starts
  static async registerServer(info: ServerInfo): Promise<void> {
    try {
      // Create config directory if it doesn't exist
      if (!fs.existsSync(this.CONFIG_DIR)) {
        fs.mkdirSync(this.CONFIG_DIR, { recursive: true });
      }
      
      // Write server info
      fs.writeFileSync(this.SERVER_INFO_FILE, JSON.stringify(info, null, 2));
    } catch (error) {
      console.error('Failed to register server:', error);
    }
  }
  
  // Remove server info when server stops
  static async unregisterServer(): Promise<void> {
    try {
      if (fs.existsSync(this.SERVER_INFO_FILE)) {
        fs.unlinkSync(this.SERVER_INFO_FILE);
      }
    } catch (error) {
      console.error('Failed to unregister server:', error);
    }
  }
  
  // Read current server info (for extension/CLI)
  static async getServerInfo(): Promise<ServerInfo | null> {
    try {
      if (fs.existsSync(this.SERVER_INFO_FILE)) {
        const data = fs.readFileSync(this.SERVER_INFO_FILE, 'utf8');
        const info = JSON.parse(data) as ServerInfo;
        
        // Check if the process is still running
        try {
          process.kill(info.pid, 0);
          return info;
        } catch {
          // Process is not running, clean up stale file
          await this.unregisterServer();
          return null;
        }
      }
    } catch (error) {
      console.error('Failed to read server info:', error);
    }
    return null;
  }
  
  // Get all possible server URLs to try
  static async getDiscoveryUrls(): Promise<string[]> {
    const urls: string[] = [];
    
    // First, check if there's a registered server
    const serverInfo = await this.getServerInfo();
    if (serverInfo) {
      if (serverInfo.host === '0.0.0.0') {
        urls.push(`http://localhost:${serverInfo.port}`);
        urls.push(`http://127.0.0.1:${serverInfo.port}`);
      } else {
        urls.push(`http://${serverInfo.host}:${serverInfo.port}`);
      }
    }
    
    // Common development ports to try as fallback
    const commonPorts = [8080, 3000, 3001, 3030, 5000, 8000];
    for (const port of commonPorts) {
      urls.push(`http://localhost:${port}`);
    }
    
    return [...new Set(urls)]; // Remove duplicates
  }
}