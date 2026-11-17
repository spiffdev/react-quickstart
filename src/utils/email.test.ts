import { isEmail } from "./email";

describe("isEmail", () => {
    it.each(["jo@example.com", "  jo@example.com  ", "jo.smith+gifts@mail.example.co.nz"])("accepts %j", (value) => {
        expect(isEmail(value)).toBe(true);
    });

    it.each(["", "jo", "jo@", "@example.com", "jo@example", "jo smith@example.com", "jo@@example.com"])(
        "rejects %j",
        (value) => {
            expect(isEmail(value)).toBe(false);
        },
    );
});
