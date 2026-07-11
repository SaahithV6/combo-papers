const DAYTONA_API_URL = process.env.DAYTONA_API_URL || 'https://app.daytona.io/api'

export interface DaytonaSandbox {
  sandboxId: string
  iframeUrl: string
}

export async function createSandbox(githubUrl: string): Promise<DaytonaSandbox> {
  const apiKey = process.env.DAYTONA_API_KEY
  if (!apiKey) throw new Error('DAYTONA_API_KEY not configured')

  const createResponse = await fetch(`${DAYTONA_API_URL}/workspace`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      repositories: [{ url: githubUrl }],
      name: `living-papers-${Date.now()}`,
    }),
  })

  if (!createResponse.ok) {
    throw new Error(`Daytona create error: ${createResponse.status}`)
  }

  const workspace = await createResponse.json()
  const workspaceId: string = workspace.id || workspace.workspaceId

  // Poll until running (check immediately, then wait)
  for (let i = 0; i < 30; i++) {
    const statusResponse = await fetch(`${DAYTONA_API_URL}/workspace/${workspaceId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}` },
    })

    if (statusResponse.ok) {
      const status = await statusResponse.json()

      if (status.state === 'running' || status.status === 'running') {
        const iframeUrl = status.iframeUrl || status.previewUrl || status.url || ''
        return { sandboxId: workspaceId, iframeUrl }
      }

      if (status.state === 'error' || status.status === 'error') {
        throw new Error('Daytona workspace failed to start')
      }
    }

    await new Promise(r => setTimeout(r, 3000))
  }

  throw new Error('Daytona workspace timed out waiting to become ready')
}

// Legacy compat
export async function createWorkspace(repoUrl?: string) {
  const result = await createSandbox(repoUrl || 'https://github.com/daytonaio/sample-python')
  return { id: result.sandboxId, url: result.iframeUrl, status: 'running' }
}

export async function getWorkspaceUrl(workspaceId: string): Promise<string> {
  const apiKey = process.env.DAYTONA_API_KEY
  if (!apiKey) throw new Error('DAYTONA_API_KEY not configured')
  const response = await fetch(`${DAYTONA_API_URL}/workspace/${workspaceId}`, {
    headers: { 'Authorization': `Bearer ${apiKey}` },
  })
  if (!response.ok) throw new Error(`Daytona API error: ${response.status}`)
  const workspace = await response.json()
  return workspace.iframeUrl || workspace.previewUrl || workspace.url
}

export interface ExecuteResult {
  stdout: string
  stderr: string
  exitCode: number
}

export async function executeCode(workspaceId: string, code: string): Promise<ExecuteResult> {
  const apiKey = process.env.DAYTONA_API_KEY
  if (!apiKey) throw new Error('DAYTONA_API_KEY not configured')

  const response = await fetch(`${DAYTONA_API_URL}/workspace/${workspaceId}/execute`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ command: 'python3', args: ['-c', code] }),
  })

  if (!response.ok) {
    throw new Error(`Daytona execute error: ${response.status}`)
  }

  const result = await response.json()
  return {
    stdout: result.stdout || result.output || '',
    stderr: result.stderr || result.error || '',
    exitCode: result.exitCode ?? result.exit_code ?? 0,
  }
}
