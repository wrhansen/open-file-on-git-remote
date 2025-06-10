// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import * as path from 'path';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
	console.log('open-file-on-git-remote extension activated'); // <--- Add this line

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "open-file-on-git-remote" is now active!');

	// // The command has been defined in the package.json file
	// // Now provide the implementation of the command with registerCommand
	// // The commandId parameter must match the command field in package.json
	// const disposable = vscode.commands.registerCommand('open-file-on-git-remote.helloWorld', () => {
	// 	// The code you place here will be executed every time your command is executed
	// 	// Display a message box to the user
	// 	vscode.window.showInformationMessage('Hello World from open-file-on-git-remote!');
	// });

	const openFileOnGitRemote = vscode.commands.registerCommand('open-file-on-git-remote.openRemoteFile', () => {
		console.log('openRemoteFile command executed');
		// Get the active text editor
		const editor = vscode.window.activeTextEditor;
		if (!editor) {
			console.error('No active text editor found.');
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
			console.error('Git extension not found.');
			vscode.window.showErrorMessage('Git extension not found.');
			return;
		}

		console.log('Number of repositories detected:', git.repositories.length);

		// Improved: Find the repository for the current file using path.relative
		const repo = git.repositories.find((r: { rootUri: { fsPath: string; }; }) => {
			console.log(`Checking repository: ${r.rootUri.fsPath}`);
			const rel = path.relative(r.rootUri.fsPath, filePath);
			const isInRepo = !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
			console.log(`Checking repo: ${r.rootUri.fsPath}, relative: ${rel}, isInRepo: ${isInRepo}`);
			return isInRepo;
		});
		if (!repo) {
			console.error('No Git repository found for file: ', filePath);
			vscode.window.showErrorMessage('No Git repository found for file: ' + filePath);
			return;
		}

		// Get the remote URL (use 'origin' by default)
		const originRemote = repo.state.remotes.find((r: { name: string; }) => r.name === 'origin') || repo.state.remotes[0];
		if (!originRemote) {
			console.error('No Git remote found for this repository.');
			vscode.window.showErrorMessage('No Git remote found for this repository.');
			return;
		}
		const gitRemoteUrl = originRemote.fetchUrl || originRemote.pushUrl;
		if (!gitRemoteUrl) {
			console.error('No Git remote URL found.');
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
		const url = `${webUrl}/blob/${branch}/${relativePath}`;

		// Open the URL in the default web browser
		vscode.env.openExternal(vscode.Uri.parse(url));
	});

	// context.subscriptions.push(disposable);
	context.subscriptions.push(openFileOnGitRemote);
}

// This method is called when your extension is deactivated
export function deactivate() {}
