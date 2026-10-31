import {afterEach,beforeEach,expect,it,vi} from "vitest";
const mock=vi.hoisted(()=>({loadEnv:vi.fn(),fetch:vi.fn(),write:vi.fn(),mkdir:vi.fn(),info:vi.fn(),error:vi.fn()}));
vi.mock("@next/env",()=>({loadEnvConfig:mock.loadEnv}));
vi.mock("node:fs/promises",()=>({writeFile:mock.write,mkdir:mock.mkdir}));
vi.mock("server-only",()=>({}));
const originalArgs=process.argv,originalExitCode=process.exitCode;
beforeEach(()=>{
 vi.resetModules();vi.clearAllMocks();process.exitCode=undefined;
 vi.stubEnv("CRON_SECRET","fake-unit-test-credential");vi.stubEnv("EVAL_BASE_URL","https://unit-test.invalid");
 vi.stubGlobal("fetch",mock.fetch);mock.fetch.mockResolvedValue({ok:true,json:async()=>({markdown:"mock hosted report"})});
 vi.spyOn(console,"info").mockImplementation(mock.info);vi.spyOn(console,"error").mockImplementation(mock.error);
});
afterEach(()=>{process.argv=originalArgs;process.exitCode=originalExitCode;vi.unstubAllEnvs();vi.unstubAllGlobals();vi.restoreAllMocks();});
it("rejects an unsupported flag before reading credentials or attempting a hosted POST",async()=>{
 process.argv=["node","evals/run.ts","--no-report"];await import("./run");
 await vi.waitFor(()=>expect(mock.error.mock.calls.length+mock.info.mock.calls.length).toBeGreaterThan(0));
 expect(mock.fetch).not.toHaveBeenCalled();expect(mock.loadEnv).not.toHaveBeenCalled();expect(process.exitCode).toBe(1);expect(mock.write).not.toHaveBeenCalled();
});
it("prints help without loading environment, writing a report, or making a request",async()=>{
 process.argv=["node","evals/run.ts","--help"];await import("./run");
 await vi.waitFor(()=>expect(mock.info).toHaveBeenCalled());
 expect(mock.info.mock.calls[0][0]).toContain("--deterministic");expect(mock.loadEnv).not.toHaveBeenCalled();expect(mock.fetch).not.toHaveBeenCalled();expect(mock.write).not.toHaveBeenCalled();expect(process.exitCode).toBeUndefined();
});
it("runs deterministic mode offline without loading credentials",async()=>{
 process.argv=["node","evals/run.ts","--deterministic"];await import("./run");
 await vi.waitFor(()=>expect(mock.write).toHaveBeenCalled());
 expect(mock.write.mock.calls[0][1]).toContain("31/31");expect(mock.loadEnv).not.toHaveBeenCalled();expect(mock.fetch).not.toHaveBeenCalled();
});
it("keeps explicit no-argument hosted invocation using only the fake test credential",async()=>{
 process.argv=["node","evals/run.ts"];await import("./run");
 await vi.waitFor(()=>expect(mock.write).toHaveBeenCalled());
 expect(mock.loadEnv).toHaveBeenCalledTimes(1);expect(mock.fetch).toHaveBeenCalledTimes(1);
 expect(mock.fetch.mock.calls[0][1].headers.authorization).toBe("Bearer fake-unit-test-credential");
});
