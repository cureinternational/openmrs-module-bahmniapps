import { getFormDrafts } from "./draftIndicatorUtils";

jest.mock("axios");

describe("getFormDrafts", () => {
    it("should return an array of draft objects", async () => {
        const drafts = await getFormDrafts("provider-uuid-1");

        expect(Array.isArray(drafts)).toBe(true);
        expect(drafts.length).toBeGreaterThan(0);
    });

    it("should return drafts with the expected shape", async () => {
        const drafts = await getFormDrafts("provider-uuid-1");

        drafts.forEach((draft) => {
            expect(draft).toHaveProperty("patientName");
            expect(draft).toHaveProperty("patientUuid");
            expect(draft).toHaveProperty("identifier");
            expect(draft).toHaveProperty("timestamp");
            expect(typeof draft.patientName).toBe("string");
            expect(typeof draft.patientUuid).toBe("string");
            expect(typeof draft.identifier).toBe("string");
            expect(typeof draft.timestamp).toBe("string");
        });
    });

    it("should return mock drafts regardless of providerUuid", async () => {
        const draftsWithUuid = await getFormDrafts("some-uuid");
        const draftsWithoutUuid = await getFormDrafts(undefined);

        expect(draftsWithUuid).toEqual(draftsWithoutUuid);
    });
});
