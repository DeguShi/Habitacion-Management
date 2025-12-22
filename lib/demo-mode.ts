/**
 * Demo mode utility
 * 
 * Checks if the app is running in demo mode (read-only, fixture data).
 * Demo mode is enabled via NEXT_PUBLIC_DEMO_MODE=1 or DEMO_MODE=1
 */

export function isDemoMode(): boolean {
    return (
        process.env.NEXT_PUBLIC_DEMO_MODE === '1' ||
        process.env.DEMO_MODE === '1'
    )
}
