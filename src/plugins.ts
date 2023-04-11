import { Buffer } from 'buffer';
const process: any = {
    env: import.meta.env,
};
(window as any).global = window;
(window as any).process = process;
(window as any).Buffer = (window as any).Buffer || Buffer;
export default process;