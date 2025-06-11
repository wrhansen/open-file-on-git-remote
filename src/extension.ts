// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	const outputChannel = vscode.window.createOutputChannel('Open File on Git Remote');
	outputChannel.show();
	outputChannel.appendLine('open-file-on-git-remote extension activated'); // <--- Add this line

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	outputChannel.appendLine('Congratulations, your extension "open-file-on-git-remote" is now active!');

	// // The command has been defined in the package.json file
	// // Now provide the implementation of the command with registerCommand
	// // The commandId parameter must match the command field in package.json
	const openFileOnGitRemote = vscode.commands.registerCommand('open-file-on-git-remote.openRemoteFile', async () => {
		outputChannel.appendLine('openRemoteFile command executed');
		// Get the active text editor
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			outputChannel.appendLine('No active text editor found.');
			vscode.window.showErrorMessage('No active text editor found.');
			return;
		}

		// Get the document URI and file name
		const document = editor.document;
		const filePath = document.uri.fsPath;

		// Get the Git extension API
		const gitExtension = vscode.extensions.getExtension('vscode.git')?.exports;
		const git = gitExtension?.getAPI(1);
		if (!git) {
			outputChannel.appendLine('Git extension not found.');
			vscode.window.showErrorMessage('Git extension not found.');
			return;
		}

		outputChannel.appendLine('Number of repositories detected: ' + git.repositories.length);

		// Improved: Find the repository for the current file using path.relative
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

		// Get the relative path of the file in the repo
		const relativePath = filePath.substring(repo.rootUri.fsPath.length + 1).replace(/\\/g, '/');

		// Convert remote URL to web URL (GitHub/GitLab/Bitbucket basic support)
		let webUrl = gitRemoteUrl
			.replace(/\.git$/, '')
			.replace(/^git@([^:]+):/, 'https://$1/')
			.replace(/^https?:\/\/([^@]+@)?/, 'https://');

		let url;
		// if(webUrl.startsWith('https://github.com')) {
		if(webUrl.startsWith('https://bitbub.com')) {
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

	outputChannel.show(true); // Optionally show the output channel

	// context.subscriptions.push(disposable);
	context.subscriptions.push(openFileOnGitRemote);
}

// This method is called when your extension is deactivated
export function deactivate() {}
