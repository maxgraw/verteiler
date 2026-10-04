/**
 * Run the cross-check over every real semester and every capacity scenario, and
 * optionally over random semesters of realistic shape from generate.ts.
 *
 * Each case goes through export.ts and verify.py exactly as a manual run would. Arguments
 * other than --random and --seed are passed on to verify.py, so CI can restrict it to
 * --solvers=cpsat.
 *
 * Exits with the worst verdict: 1 if any case contradicts the app, else 2 if any case
 * stayed inconclusive, else 0. A case HiGHS reports infeasible is skipped, except a real
 * semester under uniform capacity, which has to fit. verify.py needs a distribution
 * to check, so a wrong claim of infeasibility is not caught here.
 *
 * The seed is printed, and a failing random case names its number, so
 * --random=<n> --seed=<s> replays the exact same semesters.
 *
 * Usage: bun run tools/verify/all.ts [--random=10] [--seed=123] [--solvers=cpsat]
 *          [--time-limit=60]
 */
import { mkdtempSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { CAPACITY_SCENARIOS } from "../../tests/fixtures/capacities";
import { loadSamples, mulberry32, randomSemester } from "./generate";

const FIXTURES = "tests/fixtures";

function flag(name: string): string | undefined {
	const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
	return hit?.slice(name.length + 3);
}

const randomCount = Number(flag("random") ?? 0);
const seed = Number(flag("seed") ?? Math.floor(Math.random() * 2 ** 31));
const passThrough = process.argv
	.slice(2)
	.filter((a) => !a.startsWith("--random=") && !a.startsWith("--seed="));

const semesters = readdirSync(FIXTURES)
	.filter((f) => /^semester_\d{4}\.csv$/.test(f))
	.sort();
if (semesters.length === 0) {
	console.error(`No semester_YYYY.csv in ${FIXTURES}.`);
	process.exit(1);
}

const work = mkdtempSync(join(tmpdir(), "verteiler-verify-"));
const verdicts: { label: string; code: number }[] = [];
let caseNumber = 0;

function runCase(
	label: string,
	csvPath: string,
	capacities: number[],
	guarantees: string[],
	mustSolve: boolean,
) {
	console.log(`\n=== ${label}`);
	const exported = Bun.spawnSync(
		[
			"bun",
			"run",
			"tools/verify/export.ts",
			csvPath,
			`--capacities=${capacities.join(",")}`,
			...guarantees.map((g) => `--guarantee=${g}`),
		],
		{ stderr: "pipe" },
	);
	if (exported.exitCode !== 0) {
		const stderr = exported.stderr.toString();
		const reason = stderr.trim().split("\n").at(-1);
		// Only infeasibility is an acceptable way out. solve also throws when its own
		// validator rejects the distribution, and that is exactly what this is here to find.
		if (mustSolve || !/infeasible/i.test(stderr)) {
			console.log(`export failed: ${reason}`);
			verdicts.push({ label, code: 1 });
		} else {
			console.log(`skipped, not solvable: ${reason}`);
		}
		return;
	}

	const solution = join(work, `case-${caseNumber++}.json`);
	writeFileSync(solution, exported.stdout);
	const checked = Bun.spawnSync(
		[
			"uv",
			"run",
			"--quiet",
			"tools/verify/verify.py",
			solution,
			...passThrough,
		],
		{ stdout: "inherit", stderr: "inherit" },
	);
	verdicts.push({ label, code: checked.exitCode ?? 1 });
}

for (const file of semesters) {
	for (const [i, scenario] of CAPACITY_SCENARIOS.entries()) {
		runCase(
			`${file}, ${scenario.name}`,
			join(FIXTURES, file),
			scenario.capacities,
			[],
			i === 0,
		);
	}
}

if (randomCount > 0) {
	console.log(`\nRandom semesters: --random=${randomCount} --seed=${seed}`);
	const random = mulberry32(seed);
	const samples = loadSamples(FIXTURES);
	for (let n = 0; n < randomCount; n++) {
		const semester = randomSemester(random, samples);
		const csvPath = join(work, `random-${n}.csv`);
		writeFileSync(csvPath, semester.csv);
		const pinned = semester.guarantees.length
			? `, guarantees ${semester.guarantees.join(" ")}`
			: "";
		runCase(
			`random ${n} of seed ${seed}${pinned}`,
			csvPath,
			semester.capacities,
			semester.guarantees,
			false,
		);
	}
}

rmSync(work, { recursive: true, force: true });

const text = ["OK", "FAIL", "INCONCLUSIVE"];
console.log("\n=== Summary");
for (const { label, code } of verdicts)
	console.log(`${text[code] ?? "FAIL"}  ${label}`);
if (randomCount > 0)
	console.log(`\nReplay with --random=${randomCount} --seed=${seed}`);

const codes = verdicts.map((v) => v.code);
process.exit(
	codes.some((c) => c !== 0 && c !== 2) ? 1 : codes.includes(2) ? 2 : 0,
);
