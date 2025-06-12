// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('Open File on Git Remote');
	outputChannel.appendLine('open-file-on-git-remote extension activated');

	const openFileOnGitRemote = vscode.commands.registerCommand('open-file-on-git-remote.openRemoteFile', async (uri?: vscode.Uri) => {
		outputChannel.appendLine('openRemoteFile command executed');

		// Determine the file URI: use the argument if provided (explorer), else active editor
		let fileUri: vscode.Uri | undefined = uri;
		if (!fileUri) {
			const editor = vscode.window.activeTextEditor;
			if (!editor) {
				outputChannel.appendLine('No active text editor found and no file selected.');
				vscode.window.showErrorMessage('No active text editor found and no file selected.');
				return;
			}
			fileUri = editor.document.uri;
		}
		const filePath = fileUri.fsPath;

		// Get the Git extension API
		const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
		const git = gitExtension?.getAPI(1);
		if (!git) {
			outputChannel.appendLine('Git extension not found.');
			vscode.window.showErrorMessage('Git extension not found.');
			return;
		}

		outputChannel.appendLine('Number of repositories detected: ' + git.repositories.length);

		// Find the repository for the current file using path.relative
		const repo = git.repositories.find((r: { rootUri: { fsPath: string; }; }) => {
			outputChannel.appendLine(`Checking repository: ${r.rootUri.fsPath}`);
			const rel = path.relative(r.rootUri.fsPath, filePath);
			const isInRepo = !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
			outputChannel.appendLine(`Checking repo: ${r.rootUri.fsPath}, relative: ${rel}, isInRepo: ${isInRepo}`);
			return isInRepo;
		});
		if (!repo) {
			outputChannel.appendLine('No Git repository found for file: ' + filePath);
			vscode.window.showErrorMessage('No Git repository found for file: ' + filePath);
			return;
		}

		// Get the remote URL (use 'origin' by default)
		const originRemote = repo.state.remotes.find((r: { name: string; }) => r.name === 'origin') || repo.state.remotes[0];
		if (!originRemote) {
			outputChannel.appendLine('No Git remote found for this repository.');
			vscode.window.showErrorMessage('No Git remote found for this repository.');
			return;
		}
		const gitRemoteUrl = originRemote.fetchUrl || originRemote.pushUrl;
		if (!gitRemoteUrl) {
			outputChannel.appendLine('No Git remote URL found.');
			vscode.window.showErrorMessage('No Git remote URL found.');
			return;
		}

		// Get the current branch name
		const branch = repo.state.HEAD?.name || 'main';
		outputChannel.appendLine('branch: ' + branch);

		// Get the relative path of the file in the repo
		const relativePath = filePath.substring(repo.rootUri.fsPath.length + 1).replace(/\\/g, '/');
		outputChannel.appendLine('relativePath: ' + relativePath);

		// Convert remote URL to web URL (GitHub/GitLab/Bitbucket basic support)
		let webUrl = gitRemoteUrl
			.replace(/\.git$/, '')
			.replace(/^git@([^:]+):/, 'https://$1/')
			.replace(/^https?:\/\/([^@]+@)?/, 'https://');
		outputChannel.appendLine('webUrl: ' + webUrl);

		let url: string;
		if(webUrl.startsWith('https://github.com')) {
			url  = `${webUrl}/blob/${branch}/${relativePath}`;
		} else if (webUrl.startsWith('https://bitbucket.org')) {
			url  = `${webUrl}/src/${branch}/${relativePath}`;
		} else if (webUrl.startsWith('https://gitlab.com')) {
			url  = `${webUrl}/-/blob/${branch}/${relativePath}`;
		} else {
			// Get url string from settings
			const customUrl = vscode.workspace.getConfiguration('open-file-on-git-remote').get<string>('customUrl');
			outputChannel.appendLine('Custom URL from settings: ' + customUrl);

			if (customUrl) {
				url = customUrl
					.replace('${webUrl}', webUrl)
					.replace('${branch}', branch)
					.replace('${relativePath}', relativePath);
				outputChannel.appendLine('Using custom URL: ' + url);
			} else {
				// Fallback to a generic URL format
				outputChannel.appendLine('Unsupported Git remote URL format: ' + gitRemoteUrl + 'Please set a custom URL in settings under `openFileOnGitRemote.customUrl`.');
				vscode.window.showErrorMessage('Unsupported Git remote URL format: ' + gitRemoteUrl + 'Please set a custom URL in settings under `openFileOnGitRemote.customUrl`.');
				return;
			}
		}

		// Open the URL in the default web browser
		outputChannel.appendLine("Attempting to open URL: " + url);
		vscode.env.openExternal(vscode.Uri.parse(url));
	});

	context.subscriptions.push(openFileOnGitRemote);
}

// This method is called when your extension is deactivated
export function deactivate() {}
