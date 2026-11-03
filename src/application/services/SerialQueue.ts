/**
 * Runs layout commands one at a time, in the order the keys were pressed.
 *
 * The whole command is queued, not just its steps: "next" and "back" decide
 * where to go from the current layout, and a layout still being built has not
 * become current yet. Queueing only the steps let a quick Ctrl+Alt+3 then
 * Ctrl+Alt+] pick "next" from the layout before 3.
 */
export class SerialQueue {
    private tail: Promise<unknown> = Promise.resolve();

    run<T>(task: () => Promise<T>): Promise<T> {
        const result = this.tail.then(task);
        // One failed command must not stop the ones queued behind it.
        this.tail = result.catch(() => undefined);
        return result;
    }
}
