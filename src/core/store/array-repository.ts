import { editing } from "../domain/models";
import type { OptionalKeysOf } from "../domain/models";
import { Repository } from "./repository";
import type { SerializationError, QuotaExceededError } from "./errors";
import type { Result } from "neverthrow";

type TaskTransform<Item> = (item: Item) => Item;

interface EditorBuilder<Item extends { readonly id: string }> {
    set<K extends keyof Item>(key: K, value: Item[K]): EditorBuilder<Item>;
    clear(key: OptionalKeysOf<Item>): EditorBuilder<Item>;
    commit(): Result<Item[], SerializationError | QuotaExceededError | Error>;
}

function buildEditor<Item extends { readonly id: string }>(
    repo: ArrayRepository<Item>,
    id: string,
    target: Item,
): EditorBuilder<Item> {
    const builder = editing(target);

    return {
        set<K extends keyof Item>(key: K, value: Item[K]) {
            return buildEditor(repo, id, builder.set(key, value).done());
        },
        clear(key: OptionalKeysOf<Item>) {
            return buildEditor(repo, id, builder.clear(key).done());
        },
        commit() {
            const updated = builder.done();
            return repo.set(items => items.map(item => item.id === id ? updated : item));
        },
    };
}

function noOpEditor<Item extends { readonly id: string }>(
    repo: ArrayRepository<Item>,
    snapshot: Item[],
): EditorBuilder<Item> {
    return {
        set<K extends keyof Item>(_key: K, _value: Item[K]) { return this; },
        clear(_key: OptionalKeysOf<Item>) { return this; },
        commit() { return repo.set(snapshot); },
    };
}

export class ArrayRepository<Item extends { readonly id: string }>
    extends Repository<Item[]>
{
    edit(id: string): EditorBuilder<Item> {
        const allRes = this.get();
        const all = allRes.unwrapOr(this.initial);
        const target = all.find(item => item.id === id);
        if (!target) return noOpEditor(this, all);
        return buildEditor(this, id, target);
    }

    updateOne(id: string, transform: TaskTransform<Item>): Result<Item[], SerializationError | QuotaExceededError | Error> {
        return this.set(items => items.map(item => item.id === id ? transform(item) : item));
    }
}
