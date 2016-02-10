// Declare JavaScript extensions defined in local.extensions.js

interface String
{
    endsWith(s : string);
    startsWith(s : string); 
    replaceAll(search: string, replace: string);   
    contains(search) : boolean;
    compare(otherString) : number;
}

interface Array<T>
{
    contains(s : string); 
    find(callbackfn: (value: T, index?: number, array?: T[]) => boolean, thisArg?: any): T;
}
