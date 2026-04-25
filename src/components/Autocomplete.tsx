import parse from "autosuggest-highlight/parse";
import match from "autosuggest-highlight/match";
import { Autocomplete, AutocompleteProps, TextField } from "@mui/material";

type AnyAutoProps = AutocompleteProps<any, any, any, any>; // "any" makes it accept any option type + flag combos
type RenderOptionFn = NonNullable<AnyAutoProps["renderOption"]>;
type RenderOptionArgs = Parameters<RenderOptionFn>;
type LiProps = RenderOptionArgs[0];
type State = RenderOptionArgs[2];

export default function AutocompleteWithHighlight(props: AnyAutoProps) {
    const { options, renderInput, renderOption, ...rest } = props;

    const defaultRenderOption: RenderOptionFn = (liProps, option, state) => {
        const { key, ...optionProps } = liProps as LiProps as any;
        const label =
            typeof option === "string"
                ? option
                : String((option as any).label ?? option);
        const matches = match(label, (state as State).inputValue ?? "", {
            insideWords: true,
        });
        const parts = parse(label, matches);

        return (
            <li
                key={key}
                {...(optionProps as React.HTMLAttributes<HTMLLIElement>)}
            >
                <div>
                    {parts.map((part, i) => (
                        <span
                            key={i}
                            style={{ fontWeight: part.highlight ? 700 : 400 }}
                        >
                            {part.text}
                        </span>
                    ))}
                </div>
            </li>
        );
    };

    return (
        <Autocomplete
            {...(rest as AnyAutoProps)}
            options={options}
            renderInput={
                renderInput ??
                ((params) => (
                    <TextField {...params} label="Highlights" margin="normal" />
                ))
            }
            renderOption={renderOption ?? defaultRenderOption}
        />
    );
}
