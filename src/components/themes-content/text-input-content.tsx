import { Ionicons } from "@expo/vector-icons";
import {
  Button,
  TextField,
  Label,
  Description,
  FieldError,
  InputGroup,
  Input,
} from "heroui-native";
import { useState } from "react";
import { Pressable, View } from "react-native";
import { withUniwind } from "uniwind";
import { DialogContent } from "./dialog-content";

const StyledIonicons = withUniwind(Ionicons);

export const TextInputContent = () => {
  const [isPasswordVisible, setIsPasswordVisible] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [emailError, setEmailError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);

  const validateEmail = (value: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value);
  };

  const handleSubmit = () => {
    const isEmailValid = validateEmail(email);
    const isPasswordValid = password.length >= 6;

    setEmailError(!isEmailValid);
    setPasswordError(!isPasswordValid);

    if (isEmailValid && isPasswordValid) {
      // Form is valid
      console.log("Form submitted successfully");
    }
  };

  return (
    <View className="gap-4">
      {/* Basic TextField */}
      <TextField isRequired isInvalid={emailError}>
        <Label>Email</Label>
        <Input
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            if (emailError) setEmailError(false);
          }}
        />
        <Description>
          {`We'll never share your email with anyone else.`}
        </Description>
        <FieldError>Please enter a valid email address</FieldError>
      </TextField>

      {/* TextField with Icons */}
      <TextField isRequired isInvalid={passwordError} className="mb-8">
        <Label>New password</Label>
        <InputGroup>
          <InputGroup.Prefix isDecorative>
            <StyledIonicons
              name="lock-closed-outline"
              size={16}
              className="text-muted"
            />
          </InputGroup.Prefix>
          <InputGroup.Input
            placeholder="Enter your password"
            secureTextEntry={!isPasswordVisible}
            value={password}
            onChangeText={(text) => {
              setPassword(text);
              if (passwordError) setPasswordError(false);
            }}
          />
          <InputGroup.Suffix>
            <Pressable onPress={() => setIsPasswordVisible(!isPasswordVisible)}>
              <StyledIonicons
                name={isPasswordVisible ? "eye-off-outline" : "eye-outline"}
                size={16}
                className="text-muted"
              />
            </Pressable>
          </InputGroup.Suffix>
        </InputGroup>
        <Description>Password must be at least 6 characters</Description>
        <FieldError>Password must be at least 6 characters long</FieldError>
      </TextField>

      {/* Submit Button */}
      <Button variant="primary" onPress={handleSubmit}>
        Update
      </Button>

      <DialogContent />
    </View>
  );
};
