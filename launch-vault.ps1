$code = @"
using System;
using System.Runtime.InteropServices;

public class DesktopLauncher {
    [StructLayout(LayoutKind.Sequential, CharSet = CharSet.Unicode)]
    public struct STARTUPINFO {
        public int cb;
        public string lpReserved;
        public string lpDesktop;
        public string lpTitle;
        public int dwX;
        public int dwY;
        public int dwXSize;
        public int dwYSize;
        public int dwXCountChars;
        public int dwYCountChars;
        public int dwFillAttribute;
        public int dwFlags;
        public short wShowWindow;
        public short cbReserved2;
        public IntPtr lpReserved2;
        public IntPtr hStdInput;
        public IntPtr hStdOutput;
        public IntPtr hStdError;
    }

    [StructLayout(LayoutKind.Sequential)]
    public struct PROCESS_INFORMATION {
        public IntPtr hProcess;
        public IntPtr hThread;
        public int dwProcessId;
        public int dwThreadId;
    }

    [DllImport("kernel32.dll", SetLastError = true, CharSet = CharSet.Unicode)]
    public static extern bool CreateProcess(
        string lpApplicationName,
        string lpCommandLine,
        IntPtr lpProcessAttributes,
        IntPtr lpThreadAttributes,
        bool bInheritHandles,
        uint dwCreationFlags,
        IntPtr lpEnvironment,
        string lpCurrentDirectory,
        ref STARTUPINFO lpStartupInfo,
        out PROCESS_INFORMATION lpProcessInformation
    );

    public static int LaunchOnDefaultDesktop(string exePath, string cwd) {
        STARTUPINFO si = new STARTUPINFO();
        si.cb = Marshal.SizeOf(si);
        si.lpDesktop = @"WinSta0\Default";
        PROCESS_INFORMATION pi = new PROCESS_INFORMATION();
        bool ok = CreateProcess(null, exePath, IntPtr.Zero, IntPtr.Zero, false, 0, IntPtr.Zero, cwd, ref si, out pi);
        if (!ok) {
            return -Marshal.GetLastWin32Error();
        }
        return pi.dwProcessId;
    }
}
"@

Add-Type -TypeDefinition $code

$exe = 'C:\Telegram Drive\src-tauri\target\debug\telecloud-vault.exe'
$cmd = 'cmd.exe /c "' + $exe + ' 1> ""C:\Telegram Drive\run_stdout.log"" 2> ""C:\Telegram Drive\run_stderr.log"""'
$cwd = 'C:\Telegram Drive\src-tauri'

$pidResult = [DesktopLauncher]::LaunchOnDefaultDesktop($cmd, $cwd)
if ($pidResult -gt 0) {
    Write-Host "TeleCloud Vault successfully spawned on interactive desktop with PID: $pidResult"
} else {
    Write-Host "Failed to launch with error: $pidResult"
}
