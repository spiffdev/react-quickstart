import { FunctionComponent, Fragment, ReactNode, useEffect, useMemo, useRef, useState } from "react";
import { TemplatingKey, WorkflowManager, parseTextTemplate, parseTextTemplateForWorkflow } from "@spiffcommerce/core";
import styled, { css } from "styled-components";
import Typography from "../../../components/typography";

const fieldStyles = css<{ $error?: boolean }>`
    width: 100%;
    padding: 12px;
    border: 1px solid ${(props) => (props.$error ? "#d32f2f" : "#ccc")};
    border-radius: 4px;
    font-size: 16px;
    font-family: inherit;
    box-sizing: border-box;

    &:focus {
        outline: none;
        border-color: ${(props) => (props.$error ? "#d32f2f" : "var(--theme-primary-color)")};
    }

    &:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }
`;

const TextField = styled.input<{ $error?: boolean }>`
    ${fieldStyles}
`;

const TextArea = styled.textarea<{ $error?: boolean }>`
    ${fieldStyles}
    min-height: 80px;
    resize: vertical;
`;

// Stands in for the field while it isn't being edited. It looks like the field, and is entered by clicking or tabbing.
const Preview = styled.div<{ $error?: boolean; $multiline: boolean }>`
    ${fieldStyles}
    min-height: ${(props) => (props.$multiline ? "80px" : "46px")};
    line-height: 1.6;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    cursor: text;

    &:hover {
        border-color: var(--theme-primary-color);
    }
`;

const Chip = styled.span<{ $valid: boolean }>`
    display: inline-block;
    padding: 0 8px;
    border-radius: 10px;
    color: ${(props) => (props.$valid ? "#1b5e20" : "#b71c1c")};
    background-color: ${(props) => (props.$valid ? "#e8f5e9" : "#fdecea")};
`;

const Helper = styled(Typography)<{ $error?: boolean }>`
    margin: 4px 0 0 0;
    font-size: 12px;
    color: ${(props) => (props.$error ? "#d32f2f" : "#666")};
`;

const Snippets = styled.div`
    display: flex;
    gap: 6px;
    margin-top: 8px;
    overflow-x: auto;
    padding-bottom: 12px;
`;

const Snippet = styled.button`
    flex: none;
    padding: 4px 12px;
    font: inherit;
    font-size: 13px;
    color: var(--theme-primary-color);
    background: none;
    border: 1px solid var(--theme-primary-color);
    border-radius: 15px;
    cursor: pointer;

    &:hover:not(:disabled) {
        color: var(--theme-primary-contrast-color);
        background-color: var(--theme-primary-color);
    }

    &:disabled {
        color: #999;
        border-color: #ccc;
        cursor: not-allowed;
    }
`;

const INVALID_FIELD = "This couldn't be filled in, so it would be blank in the design.";
const UNPARSEABLE = "This text has a field that isn't finished, such as a `{{` without its `}}`.";

/** The text with its templating fields filled in: valid ones as green chips, ones which would be blank as red ones. */
const renderedParts = (parts: ReturnType<typeof parseTextTemplate>["parts"]): ReactNode =>
    parts.map((part, index) =>
        part.type === "text" ? (
            <Fragment key={index}>{part.original}</Fragment>
        ) : (
            <Chip key={index} $valid={part.valid} title={part.valid ? part.original : INVALID_FIELD}>
                {part.valid && part.rendered ? part.rendered : part.original}
            </Chip>
        ),
    );

/**
 * A text field for text which can use templating fields. Its fields are offered as buttons which insert them where the
 * cursor is. When it isn't being edited the text is shown as the design will have it, with each field's value in a chip
 * (green when it has one, red when it would be blank).
 */
const TemplateTextField: FunctionComponent<{
    value: string;
    onChange: (value: string) => void;
    multiline: boolean;
    keys: TemplatingKey[];
    /** What the fields are filled in from. Without it, none of them can be. */
    workflowManager: WorkflowManager | undefined;
    ariaLabel?: string;
    placeholder?: string;
    disabled?: boolean;
    /** The text's own problem, such as a blocked word, and the line shown under the field. */
    error?: boolean;
    helperText?: string;
    onFieldFocus?: () => void;
}> = ({
    value,
    onChange,
    multiline,
    keys,
    workflowManager,
    ariaLabel,
    placeholder,
    disabled,
    error = false,
    helperText,
    onFieldFocus,
}) => {
    const rootRef = useRef<HTMLDivElement>(null);
    const fieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
    const [editing, setEditing] = useState(false);
    // Set when the customer asked to edit from the preview, so the field is focused once it exists.
    const focusOnShow = useRef(false);

    const parsed = useMemo(
        () => (workflowManager ? parseTextTemplateForWorkflow(value, workflowManager) : parseTextTemplate(value)),
        [value, workflowManager],
    );
    const hasFields = parsed.parts.some((part) => part.type === "template");
    // Without a field in it there is nothing to show but the text, so it stays editable.
    const previewing = !editing && !disabled && parsed.parseable && hasFields;
    const unparseable = !parsed.parseable && value !== "";
    const invalid = error || unparseable;

    useEffect(() => {
        if (!previewing && focusOnShow.current) {
            focusOnShow.current = false;
            const field = fieldRef.current;
            field?.focus();
            field?.setSelectionRange(field.value.length, field.value.length);
        }
    }, [previewing]);

    const startEditing = () => {
        focusOnShow.current = true;
        setEditing(true);
    };

    // Moving between the field, the preview and the buttons doesn't end editing; leaving all of them does.
    const handleBlur = (event: React.FocusEvent) => {
        // The preview going away (to make room for the field) isn't the customer leaving.
        if ((event.target as HTMLElement).dataset.preview !== undefined) return;
        if (!rootRef.current?.contains(event.relatedTarget as Node | null)) setEditing(false);
    };

    // A field is kept apart from the words around it: a space goes before it, and after it, unless there's already
    // whitespace there, or nothing.
    const spaced = (token: string, before: string, after: string) =>
        `${before !== "" && !/\s$/.test(before) ? " " : ""}${token}${after !== "" && !/^\s/.test(after) ? " " : ""}`;

    const insert = (key: string) => {
        const token = `{{${key}}}`;
        const field = fieldRef.current;
        if (field && document.activeElement === field) {
            const start = field.selectionStart ?? value.length;
            const end = field.selectionEnd ?? start;
            const text = spaced(token, value.slice(0, start), value.slice(end));
            // Inserted as if typed, so the customer can undo it.
            field.focus();
            if (document.execCommand("insertText", false, text)) return;
            onChange(value.slice(0, start) + text + value.slice(end));
            return;
        }
        // Nowhere in the text has been chosen, so it goes on the end.
        onChange(value + spaced(token, value, ""));
        startEditing();
    };

    const fieldProps = {
        value,
        disabled,
        placeholder,
        "aria-label": ariaLabel,
        "aria-invalid": invalid,
        $error: invalid,
        onChange: (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(event.target.value),
        onFocus: () => {
            setEditing(true);
            onFieldFocus?.();
        },
        ref: (element: HTMLInputElement | HTMLTextAreaElement | null) => {
            fieldRef.current = element;
        },
    };

    return (
        <div ref={rootRef} onBlur={handleBlur}>
            {previewing ? (
                <Preview
                    data-preview=""
                    role="textbox"
                    tabIndex={0}
                    aria-label={ariaLabel}
                    aria-readonly="true"
                    $multiline={multiline}
                    $error={invalid}
                    onClick={startEditing}
                    onFocus={startEditing}
                >
                    {renderedParts(parsed.parts)}
                </Preview>
            ) : multiline ? (
                <TextArea {...fieldProps} />
            ) : (
                <TextField type="text" {...fieldProps} />
            )}
            {(unparseable || helperText) && (
                <Helper variant="span" $error={invalid} style={{ display: "block" }}>
                    {unparseable && !error ? UNPARSEABLE : helperText}
                </Helper>
            )}
            {keys.length > 0 && (
                <Snippets>
                    {keys.map((templatingKey) => (
                        <Snippet
                            key={templatingKey.key}
                            type="button"
                            disabled={disabled}
                            title={
                                templatingKey.value
                                    ? `{{${templatingKey.key}}} — ${templatingKey.value}`
                                    : `{{${templatingKey.key}}}`
                            }
                            // Keeps the cursor in the field, so the snippet goes where it was.
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => insert(templatingKey.key)}
                        >
                            {templatingKey.label}
                        </Snippet>
                    ))}
                </Snippets>
            )}
        </div>
    );
};

export default TemplateTextField;
