/* oxlint-disable max-classes-per-file */
export class QuotaExceededError extends Error {
    constructor(message: string = "localStorage quota exceeded") {
        super(message);
        this.name = "QuotaExceededError";
    }
}

export class SerializationError extends Error {
    constructor(message: string = "Failed to serialize data") {
        super(message);
        this.name = "SerializationError";
    }
}

export class DataCorruptionError extends Error {
    constructor(message: string = "Data read from storage is corrupted or unmatched schema") {
        super(message);
        this.name = "DataCorruptionError";
    }
}
